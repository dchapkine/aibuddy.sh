#!/bin/bash

# Define constants
GLOBAL_AIBUDDY_FILE=~/.aibuddy
LOCAL_AIBUDDY_FILE=".aibuddy"
SELF_PATH="/usr/local/bin/aibuddy"
BATCH_SIZE=10  # Number of files per batch for processing

# Function: Perform global installation
install_global() {
    echo "Running global installation..."

    if [ -f "$GLOBAL_AIBUDDY_FILE" ]; then
        echo "Global installation detected. Using existing API key."
    else
        # Prompt for OpenAI API key if not already set
        read -p "Enter your OpenAI API Key: " OPENAI_API_KEY

        # Save to global ~/.aibuddy
        echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\"" > "$GLOBAL_AIBUDDY_FILE"
        chmod 600 "$GLOBAL_AIBUDDY_FILE"
    fi

    # Copy the script to /usr/local/bin
    if [ "$0" != "$SELF_PATH" ]; then
        sudo cp "$0" "$SELF_PATH"
        sudo chmod +x "$SELF_PATH"
        echo "Installed globally as 'aibuddy'."
    fi

    echo "Installation complete."
}

# Function: Perform local installation
install_local() {
    echo "Running local installation..."

    # Source the global aibuddy file
    source "$GLOBAL_AIBUDDY_FILE"

    # Generate the CONTEXT_FILES variable using git ls-files
    echo "Using git ls-files to gather files with specified extensions..."
    CONTEXT_FILES=$(git ls-files | grep -E '\.(sh|ts|js|mjs|ejs|css|less|html|jsx|py|cpp|c|go|rs|php|r|rd|rsx|sql|rb|vue)$' | tr '\n' ';')

    # Ensure CONTEXT_FILES is not empty
    if [ -z "$CONTEXT_FILES" ]; then
        echo "Error: No matching files found for context. Ensure your repository contains files with the specified extensions."
        exit 1
    fi

    # Prompt for app description
    read -p "Describe your app: " APP_DESCRIPTION

    # Write local .aibuddy file
    {
        echo "source \"$GLOBAL_AIBUDDY_FILE\""
        echo "export CONTEXT_FILES=\"$CONTEXT_FILES\""
        echo "export APP_DESCRIPTION=\"$APP_DESCRIPTION\""
    } > "$LOCAL_AIBUDDY_FILE"

    chmod 600 "$LOCAL_AIBUDDY_FILE"
    echo "Local installation complete."
}

# Function: Run assistant mode
assistant_mode() {
    echo "Running assistant mode..."

    # Source the local aibuddy file
    source "$LOCAL_AIBUDDY_FILE"

    # Inform the user about reloading context if necessary
    echo "Reminder: If you add new files, run 'aibuddy re' to regenerate the context."

    # Prepare the prompt for a single diff output for all files
    PROMPT_FILE="/tmp/aibuddy_prompt.txt"
    RESPONSE_FILE="/tmp/aibuddy_response.json"
    PATCH_FILE="/tmp/aibuddy_patch.diff"

    echo "$APP_DESCRIPTION" > "$PROMPT_FILE"
    echo -e "\n### You will use following files and it's contents below the name as current state of of each file to calculate and output your final diff" >> "$PROMPT_FILE"

    IFS=';' read -ra FILES <<< "$CONTEXT_FILES"

    for FILE in "${FILES[@]}"; do
        if [ -f "$FILE" ]; then
            echo -e "\n### File: $FILE" >> "$PROMPT_FILE"
            cat "$FILE" | tr -d '\0' >> "$PROMPT_FILE"
        fi
    done

    echo -e "\n### Request: $1" >> "$PROMPT_FILE"
    echo -e "\#### OUTPUT NOTHING ELSE THAN a raw valid JSON OBJECT with a list of updated filenames as keys and FULL patched file content of modified files as values. IF there is no valid reply output an empty json. DO NOT OUTPUT ANYTHING ELSE. REMOVE ANY JSON OBJECT PREFIXES like \`\`\`json OR \`\`\`" >> "$PROMPT_FILE"

    # Create JSON payload for chat model
    jq -n --arg model "gpt-4o-mini-2024-07-18" --rawfile prompt "$PROMPT_FILE" '{
        model: $model,
        messages: [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": $prompt}
        ],
        max_tokens: 16000
    }' > "$RESPONSE_FILE"

    # Call OpenAI API using the chat/completions endpoint
    RESPONSE=$(curl -s -X POST https://api.openai.com/v1/chat/completions \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        --data @$RESPONSE_FILE)

    # Check if response contains an error
    if echo "$RESPONSE" | jq -e 'has("error")' > /dev/null; then
        ERROR_MESSAGE=$(echo "$RESPONSE" | jq -r '.error.message')
        echo "Error from OpenAI API: $ERROR_MESSAGE"
        rm "$PROMPT_FILE" "$RESPONSE_FILE"
        exit 1
    fi

    # Save the raw response for debugging
    echo "$RESPONSE" > "$RESPONSE_FILE"

    # Extract the diff from the response
    echo "$RESPONSE" | jq -r '.choices[0].message.content' > "$PATCH_FILE"

    # Apply the patch using git-compatible tools
    if [ -s "$PATCH_FILE" ]; then
        # Check if jq is installed
        if ! command -v jq &>/dev/null; then
          echo "jq is required but not installed. Please install jq and try again."
          exit 1
        fi

        # Loop over each key (filename) in the JSON
        for key in $(jq -r 'keys[]' "$PATCH_FILE"); do
          # Create directory structure if needed
          dir=$(dirname "$key")
          mkdir -p "$dir"

          # Extract file content and write to the corresponding file
          jq -r --arg key "$key" '.[$key]' "$PATCH_FILE" > "$key"

          echo "Written file: $key"
        done
        echo "Patch applied successfully."
    else
        echo "No changes detected or invalid patch received."
        rm "$PATCH_FILE"
    fi

    # Clean up the prompt file
    rm "$PROMPT_FILE" "$RESPONSE_FILE"

    echo "Assistant mode complete."
}

# Main logic
if [[ "$1" == "install" ]]; then
    install_global
elif [ ! -f "$GLOBAL_AIBUDDY_FILE" ]; then
    install_global
elif [ ! -f "$LOCAL_AIBUDDY_FILE" ]; then
    install_local
elif [[ "$1" == "re" || "$1" == "reload" ]]; then
    install_local
else
    assistant_mode "$1"
fi
