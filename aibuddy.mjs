#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { execSync } from 'child_process';
import readline from 'readline/promises';

// -------------------------------
// Constants
// -------------------------------
const GLOBAL_AIBUDDY_FILE = path.join(os.homedir(), '.aibuddy.json');
const LOCAL_AIBUDDY_FILE = '.aibuddy.json';
const SELF_PATH = '/usr/local/bin/aibuddy.mjs';
const HELPER_PATH = '/usr/local/bin/aibuddy';
const SUPPORTED_FILE_EXTENSIONS = "sh|ts|js|mjs|ejs|css|less|html|jsx|py|cpp|c|go|rs|php|r|rd|rsx|sql|rb|vue|swift|java|kotlin|dart|scala|rust|clj|cljc|edn|lua|mlx|groovy|asm|pl|erl|o|ex|exs|pas|d|nim|ml|pike|sql|yaml|yml|json|xml|txt|md|markdown|csv|bat|ps1";

// -------------------------------
// Helper Functions
// -------------------------------

/**
 * Check if a file exists.
 */
function fileExists(filepath) {
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON from a file. Returns an object or an empty object if file not found or parse fails.
 */
function parseJSONFile(filepath) {
  if (!fileExists(filepath)) return {};
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Write an object to a JSON file (pretty-printed).
 */
function writeJSONFile(filepath, dataObj) {
  const jsonString = JSON.stringify(dataObj, null, 2);
  fs.writeFileSync(filepath, jsonString);
}

/**
 * Prompt user for input (Node.js 18+).
 */
async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

// -------------------------------
// Installation Functions
// -------------------------------

/**
 * Global installation:
 * - Prompts for OPENAI_API_KEY if not set
 * - Writes it to ~/.aibuddy.json
 * - Copies the script to /usr/local/bin if needed
 */
async function installGlobal() {
  console.log('Running global installation...');

  let globalData = parseJSONFile(GLOBAL_AIBUDDY_FILE);

  if (globalData.OPENAI_API_KEY) {
    console.log('Global installation detected. Using existing API key.');
  } else {
    const OPENAI_API_KEY = await promptUser('Enter your OpenAI API Key: ');
    globalData.OPENAI_API_KEY = OPENAI_API_KEY;
    writeJSONFile(GLOBAL_AIBUDDY_FILE, globalData);
    console.log(`Created/updated global config: ${GLOBAL_AIBUDDY_FILE}`);
  }

  // Copy this script to /usr/local/bin (global)
  const currentScript = process.argv[1];
  if (currentScript !== SELF_PATH) {
    try {
      execSync(`sudo cp "${currentScript}" "${SELF_PATH}"`);
      execSync(`sudo chmod +x "${SELF_PATH}"`);

      // create helper
      const HELPER_CONTENT = `
#!/usr/bin/env bash
${SELF_PATH} "$@" 
      `;
      fs.writeFileSync('./helper', HELPER_CONTENT);
      execSync(`sudo mv ./helper "${HELPER_PATH}"`);
      execSync(`sudo chmod +x ${HELPER_PATH}`);
      console.log("Installed globally as 'aibuddy'.");
    } catch (error) {
      console.error('Error copying script to /usr/local/bin:', error.message);
      process.exit(1);
    }
  }

  console.log('Global installation complete.');
}

/**
 * Local installation:
 * - Reads global ~/.aibuddy.json to get the API key
 * - Gathers CONTEXT_FILES using `git ls-files`
 * - Prompts for APP_DESCRIPTION
 * - Writes them to local .aibuddy.json
 *
 * CHANGED: We now store CONTEXT_FILES as a JSON array.
 */
async function installLocal() {
  console.log('Running local installation...');

  // Read global for the API key
  const globalData = parseJSONFile(GLOBAL_AIBUDDY_FILE);
  if (!globalData.OPENAI_API_KEY) {
    console.error(
      'No valid OpenAI API Key found in global ~/.aibuddy.json. Please run install first.'
    );
    process.exit(1);
  }

  // Read global for the API key
  let oldLocalData = {};
  try {
    oldLocalData = parseJSONFile(LOCAL_AIBUDDY_FILE);
  } catch (ex) {}

  // Gather context files
  console.log("Using 'git ls-files' to gather files with specified extensions...");
  let fileList = [];
  try {
    const stdout = execSync(
      `git ls-files | grep -E '\\.(${SUPPORTED_FILE_EXTENSIONS})$'`
    ).toString();
    // Split on newlines => get an array
    fileList = stdout.trim().split('\n').filter(Boolean);
  } catch (err) {
    console.error('Error: Could not gather context files. Make sure this is a git repo with matching files.');
    process.exit(1);
  }

  if (fileList.length === 0) {
    console.error('Error: No matching files found for context. Check your repository contents.');
    process.exit(1);
  }

  // Prompt for app description
  const APP_DESCRIPTION = oldLocalData.APP_DESCRIPTION || await promptUser('Describe your app: ');

  // Write local .aibuddy.json with an array for CONTEXT_FILES
  const localData = {
    CONTEXT_FILES: fileList,
    APP_DESCRIPTION,
  };
  writeJSONFile(LOCAL_AIBUDDY_FILE, localData);

  console.log('Local installation complete.');
}

function sanitizeJSON(str) {
  // 1. First check: if 'str' is already valid JSON.
  try {
    JSON.parse(str);
    return str; // it's valid JSON, return as-is.
  } catch {
    // 2. Not valid JSON, try removing code fences like ```json ... ```
    const withoutFences = str.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1');

    // 3. Check if fence-stripped version is valid JSON
    try {
      JSON.parse(withoutFences);
      return withoutFences;
    } catch {
      // 4. Still not valid JSON, return the original string or handle as needed
      return str;
    }
  }
}


// -------------------------------
// Plan Mode
// -------------------------------
async function planningMode(requestArg = '') {
  console.log('Running planning mode...');

  // Check for local config
  if (!fileExists(LOCAL_AIBUDDY_FILE)) {
    console.error(`Local ${LOCAL_AIBUDDY_FILE} file is missing. Run install first.`);
    process.exit(1);
  }

  // Merge global + local JSON data
  const globalData = parseJSONFile(GLOBAL_AIBUDDY_FILE);
  const localData = parseJSONFile(LOCAL_AIBUDDY_FILE);
  const mergedData = { ...globalData, ...localData };

  const { OPENAI_API_KEY, CONTEXT_FILES, APP_DESCRIPTION } = mergedData;
  if (!OPENAI_API_KEY) {
    console.error('Error: No OPENAI_API_KEY found. Please set it up via install.');
    process.exit(1);
  }

  console.log("Reminder: If you add new files, run 'aibuddy re' to regenerate the context.");

  // Prepare temporary file paths
  const PROMPT_FILE = '/tmp/aibuddy_prompt.txt';
  const RESPONSE_FILE = '/tmp/aibuddy_response.json';
  const PATCH_FILE = '/tmp/aibuddy_patch.diff'; // JSON content with { filename: fileContent }
  const PLAN_FILE = './.aibuddy.plan';

  // Build prompt content
  let promptContent = `${APP_DESCRIPTION}\n`;
  promptContent += `\n### You will use the following files (with contents below) as the current state to generate your answer.\n`;

  // CONTEXT_FILES is now an array
  const files = Array.isArray(CONTEXT_FILES) ? CONTEXT_FILES : [];
  for (const filePath of files) {
    if (fileExists(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8').replace(/\0/g, '');
      promptContent += `\n### File: ${filePath}\n${fileContent}`;
    }
  }

  // Add user request
  promptContent += `\n### Request: ${requestArg}\n`;
  promptContent += `\n#### OUTPUT NOTHING ELSE THAN a JSON object containing a list of of prompts to achieve the Request above, in following format: {"plan": [{"desc": "...brief prompt description...", "prompt": "...detailed prompt to implement this step..."}]}`;

  fs.writeFileSync(PROMPT_FILE, promptContent);

  // Create JSON payload for OpenAI Chat
  /*
  // gpt-4o-mini-2024-07-18
  const payload = {
    model: 'gpt-4o-mini-2024-07-18',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: promptContent },
    ],
    max_tokens: 16000,
  };
  */
  const payload = {
    model: 'o1-mini-2024-09-12',
    messages: [
      { role: 'user', content: 'You are a helpful assistant.' },
      { role: 'user', content: promptContent },
    ],
    max_completion_tokens: 16000,
  };
  fs.writeFileSync(RESPONSE_FILE, JSON.stringify(payload, null, 2));

  // Make the API call using fetch (Node 18+)
  let responseData;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    responseData = await response.json();
  } catch (err) {
    console.error('Network or fetch error:', err);
    cleanupFiles();
    process.exit(1);
  }

  // Check OpenAI error
  if (responseData?.error) {
    console.error(`Error from OpenAI API: ${responseData.error.message}`);
    cleanupFiles();
    process.exit(1);
  }

  // Extract the model's reply
  const modelContent = responseData?.choices?.[0]?.message?.content || '';
  fs.writeFileSync(PATCH_FILE, modelContent);


  // Attempt to parse JSON
  let jsonPlan;
  try {
    const rawJsonString = sanitizeJSON(modelContent.trim());
    jsonPlan = JSON.parse(rawJsonString);
  } catch (err) {
    console.log('No valid JSON patch received or the content is empty.');
    console.log(err)
    cleanupFiles();
    return;
  }

  // store plan locally
  fs.writeFileSync(PLAN_FILE, JSON.stringify(jsonPlan, null, '  '));

  // show plan
  for (let step of jsonPlan.plan) {
    console.log(`# ${step.desc}`);
    console.log(`  ${step.prompt}`);
    console.log("")
  }

  console.log('THE END');
  cleanupFiles();
  console.log('Planning mode complete.');

  function cleanupFiles() {
    for (const file of [PROMPT_FILE, RESPONSE_FILE, PATCH_FILE]) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}


// -------------------------------
// Assistant Mode
// -------------------------------
async function assistantMode(requestArg = '') {
  console.log('Running assistant mode...');

  // Check for local config
  if (!fileExists(LOCAL_AIBUDDY_FILE)) {
    console.error(`Local ${LOCAL_AIBUDDY_FILE} file is missing. Run install first.`);
    process.exit(1);
  }

  // Merge global + local JSON data
  const globalData = parseJSONFile(GLOBAL_AIBUDDY_FILE);
  const localData = parseJSONFile(LOCAL_AIBUDDY_FILE);
  const mergedData = { ...globalData, ...localData };

  const { OPENAI_API_KEY, CONTEXT_FILES, APP_DESCRIPTION } = mergedData;
  if (!OPENAI_API_KEY) {
    console.error('Error: No OPENAI_API_KEY found. Please set it up via install.');
    process.exit(1);
  }

  console.log("Reminder: If you add new files, run 'aibuddy re' to regenerate the context.");

  // Prepare temporary file paths
  const PROMPT_FILE = '/tmp/aibuddy_prompt.txt';
  const RESPONSE_FILE = '/tmp/aibuddy_response.json';
  const PATCH_FILE = '/tmp/aibuddy_patch.diff'; // JSON content with { filename: fileContent }

  // Build prompt content
  let promptContent = `${APP_DESCRIPTION}\n`;
  promptContent += `\n### You will use the following files (with contents below) as the current state to generate your final diff.\n`;

  // CONTEXT_FILES is now an array
  const files = Array.isArray(CONTEXT_FILES) ? CONTEXT_FILES : [];
  for (const filePath of files) {
    if (fileExists(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8').replace(/\0/g, '');
      promptContent += `\n### File: ${filePath}\n${fileContent}`;
    }
  }

  // Add user request
  promptContent += `\n### Request: ${requestArg}\n`;
  promptContent += `\n#### OUTPUT NOTHING ELSE THAN a raw valid JSON OBJECT with a list of updated filenames as keys and FULL patched file content as values
  Example: { "file1.js": "console.log('hi');" }
  IF there is no valid reply output an empty json.
  DO NOT OUTPUT ANYTHING ELSE.
  REMOVE ANY MARKDOWN OBJECT PREFIXES and SUFFIXES around JSON object like \`\`\`json OR \`\`\`.\n`;

  fs.writeFileSync(PROMPT_FILE, promptContent);

  // Create JSON payload for OpenAI Chat
  /*
  // gpt-4o-mini-2024-07-18
  const payload = {
    model: 'gpt-4o-mini-2024-07-18',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: promptContent },
    ],
    max_tokens: 16000,
  };
  */
  const payload = {
    model: 'o1-mini-2024-09-12',
    messages: [
      { role: 'user', content: 'You are a helpful assistant.' },
      { role: 'user', content: promptContent },
    ],
    max_completion_tokens: 16000,
  };
  fs.writeFileSync(RESPONSE_FILE, JSON.stringify(payload, null, 2));

  // Make the API call using fetch (Node 18+)
  let responseData;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    responseData = await response.json();
  } catch (err) {
    console.error('Network or fetch error:', err);
    cleanupFiles();
    process.exit(1);
  }

  // Check OpenAI error
  if (responseData?.error) {
    console.error(`Error from OpenAI API: ${responseData.error.message}`);
    cleanupFiles();
    process.exit(1);
  }

  // Extract the model's reply
  const modelContent = responseData?.choices?.[0]?.message?.content || '';
  fs.writeFileSync(PATCH_FILE, modelContent);

  // Attempt to parse JSON
  let jsonPatch;
  try {
    const rawJsonString = sanitizeJSON(modelContent.trim());
    jsonPatch = JSON.parse(rawJsonString);
  } catch {
    console.log('No valid JSON patch received or the content is empty.');
    cleanupFiles();
    return;
  }

  // If the patch is empty or invalid
  const patchKeys = Object.keys(jsonPatch);
  if (patchKeys.length === 0) {
    console.log('No changes detected or an empty JSON object returned.');
    cleanupFiles();
    return;
  }

  // Apply changes
  for (const filename of patchKeys) {
    // Create directories if needed
    const dir = path.dirname(filename);
    if (dir && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write file content
    fs.writeFileSync(filename, jsonPatch[filename], 'utf-8');
    console.log(`Written file: ${filename}`);
  }

  console.log('Patch applied successfully.');
  cleanupFiles();
  console.log('Assistant mode complete.');

  function cleanupFiles() {
    for (const file of [PROMPT_FILE, RESPONSE_FILE, PATCH_FILE]) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

// -------------------------------
// Main logic
// -------------------------------
(async function main() {
  const arg = process.argv[2];

  if (arg === 'install') {
    await installGlobal();
  } else if (!fileExists(GLOBAL_AIBUDDY_FILE)) {
    // If no global config, do global install first
    await installGlobal();
  } else if (!fileExists(LOCAL_AIBUDDY_FILE)) {
    // If no local config, do local install
    await installLocal();
  } else if (arg === 're' || arg === 'reload') {
    // Regenerate local context (CONTEXT_FILES array + APP_DESCRIPTION)
    await installLocal();
  } else if (arg === 'plan') {
    await planningMode(process.argv[3]);
  } else {
    // Default is assistant mode
    await assistantMode(arg);
  }
})();


