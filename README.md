# aibuddy.sh

Actually useful, workspace aware AI assistant for GIT, unafraid to update multiple files.

The goal is to actually have an equivalent to JR developer on your side.

Today the tools feels like you are coaching a JR developer and watching him code: if your instructions are clear and contained enough, it gives great results, using gpt4o model.

Still it gives a productivity boost, as we work on a feature level, workspace level and allow the assistant to update or create any file it sees fit to implement a given feature, which differs with current mainstream assistants, often only useful on a file scope, when it comes to implementation. This tool is aiming at a higher level of control.


# POC limitations

- Only scans for sh|ts|js|mjs|ejs|css|less|html|jsx|py|cpp|c|go|rs|php|r|rd|rsx|sql|rb|vue files
- Requires to be run within a local GIT repository
- Requires Open AI API key
- Uses one specific model: gpt-4o-mini-2024-07-18
- 16k max token input
- tested on linux only
- it is a POC...

# Next ?

- automating agent planning with `aibuddy plan` (so far I do this step manually)
- standardising agentic workflow
- support more LLMS (ollama integration, AWS Q)


# Usage

ask to implement a feature

```
# this will build a prompt with your code as context, then update or ce=reate fiels necessary for your change
# result will vary depending on how do you descrpt your features, experiment to find the sweet spot, properly communicating an idea to AI is a skill in itself
cd your_git_repo
aibuddy "your feature request"
```


reload context

```
# recursively rescans files to include as part of the the context for the ai model
# you can also modify local ./.aibuddy file manually
cd your_git_repo
aibuddy re
```

# Installation

The POC works wiht open ai, so it will ask your for your open ai API key and store it in ~/.aibuddy config file

installation requirements

```
git
jq
nash
```

insane one line install

```
curl -fsSL https://raw.githubusercontent.com/dchapkine/aibuddy.sh/refs/heads/main/aibuddy-install.sh -o /tmp/aibuddy-install.sh && bash /tmp/aibuddy-install.sh install && rm /tmp/aibuddy-install.sh
```

sane(r) install

```
wget https://raw.githubusercontent.com/dchapkine/aibuddy.sh/refs/heads/main/aibuddy-install.sh
# inspect downloaded script
chmod +x aibuddy-install.sh 
./aibuddy-install.sh install
```



# Example 1: adding a similar feature

```
aibuddy "use the same tags js library for sharedWithEmails input in views/spaces_new.ejs than in views/spaces_edit.ejs"
```
![image](https://github.com/user-attachments/assets/b4fabde4-16ac-4b1e-a0f0-cb04a7ef2ccc)

# Example 2: refactor code

```
aibuddy "move express routes out of index.js into dedicated route files under routes folder. Make sure each route file requires all needed dependencies to function independently and correctly. Update index.js to remove those route declarations and replace them with routes required from routes/* files"
```

*ignore the diff showing for confidentiality*

# Example 3: refactor code

```
aibuddy "move mailgun code into utils/mailgun.js out of index.js and update all files using mailgun to require nad reuse utils/mailgun.js instead"
```

*ignore the diff showing for confidentiality*
