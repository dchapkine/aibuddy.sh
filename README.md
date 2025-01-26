# aibuddy.sh

Actually useful, workspace aware AI assistant for GIT, unafraid to update multiple files.

The goal is to actually have an equivalent to JR developer on your side.

Today the tools feels like you are coaching a JR developer and watching him code: if your instructions are clear and contained enough, it gives great results, using o1-mini-2024-09-12 model.

Still it gives a productivity boost, as we work on a feature level, workspace level and allow the assistant to update or create any file it sees fit to implement a given feature, which differs with current mainstream assistants, often only useful on a file scope, when it comes to implementation. This tool is aiming at a higher level of control.


# POC limitations

- Requires to be run within a local GIT repository
- Requires Open AI API key
- Uses one specific model, one provider
- 16k max token input
- tested on linux only
- it is a POC...

# Next ?

- automating agent planning with `aibuddy plan` (so far I do this step manually)
- standardising agentic workflow
- support more LLMS (ollama integration, AWS Q)
- while I love the simplicity of havin a single .sh, this will probably be migrated to another language


# Plan

*aibuddy plan "......"*

Ask AI to plan your changes braking them down into prompts

`aibuddy plan "create a view and express route to visualise users interaction with a space from the owner point of view. Reuse interactions already stored in userActions mongoose model. Only the space owner will have access"`

```bash
Running planning mode...
Reminder: If you add new files, run 'aibuddy re' to regenerate the context.
# Add a new Express route to handle fetching and displaying user interactions for a specific space.
  Update the `routes/spaces.js` file to include a new GET route at `/spaces/:id/insights`. This route should:

1. Ensure the requester is the owner of the space using the `ensureLoggedIn` middleware.
2. Retrieve all relevant user interactions from the `UserAction` mongoose model where `resourceType` is `'space'` and `spaceId` matches the provided space ID.
3. Pass the retrieved interactions to a new EJS view named `space_insights.ejs` for rendering.

Ensure proper error handling for cases where the space does not exist or the user is not authorized.

# Create the `space_insights.ejs` view to visualize user interactions within a space.
  In the `views` directory, create a new file named `space_insights.ejs`. This view should:

1. Extend the partial header and footer to maintain consistent styling.
2. Display the space's name and description at the top.
3. Present a summary of user interactions, such as number of logins, recordings created, edits made, and deletions.
4. Include a detailed table or list that chronologically displays each interaction with details like action type, user email, and timestamp.
5. Add filters or search functionality to allow the space owner to easily navigate through interactions.

# Ensure the new insights route is secured and only accessible by the space owner.
  Verify that the new `/spaces/:id/insights` route in `routes/spaces.js` uses the `ensureLoggedIn` middleware to authenticate the user. Additionally, implement a check to confirm that the authenticated user's email matches the `ownerEmail` of the space being accessed. If the user is not the owner, respond with a 403 Forbidden status.

# Update the Mongoose models if necessary to support additional queries for user interactions.
  Review the existing `UserAction` mongoose model in `models/userAction.js` to ensure it includes all necessary fields to support detailed interaction insights. If additional fields or indexes are required for optimized querying (e.g., indexing `spaceId` and `actionType`), update the schema accordingly and apply the changes to the database.

# Test the new insights functionality to ensure accurate and secure data presentation.
  After implementing the new route and view, perform comprehensive testing to ensure that:

1. Only the space owner can access the `/spaces/:id/insights` route.
2. All user interactions related to the space are accurately fetched from the `UserAction` model.
3. The `space_insights.ejs` view correctly displays the interactions in a clear and organized manner.
4. Proper error messages and status codes are returned for unauthorized access or non-existent spaces.

Use both manual testing and writing automated tests if applicable.

THE END
Planning mode complete.

```

Planning results in a creation of the `.aibuddy.plan` file.

The plan will later be used by `aibuddy apply` command (wip)

```
$ cat .aibuddy.plan 
{
  "plan": [
    {
      "desc": "Add a new Express route to handle fetching and displaying user interactions for a specific space.",
      "prompt": "Update the `routes/spaces.js` file to include a new GET route at `/spaces/:id/insights`. This route should:\n\n1. Ensure the requester is the owner of the space using the `ensureLoggedIn` middleware.\n2. Retrieve all relevant user interactions from the `UserAction` mongoose model where `resourceType` is `'space'` and `spaceId` matches the provided space ID.\n3. Pass the retrieved interactions to a new EJS view named `space_insights.ejs` for rendering.\n\nEnsure proper error handling for cases where the space does not exist or the user is not authorized."
    },
    {
      "desc": "Create the `space_insights.ejs` view to visualize user interactions within a space.",
      "prompt": "In the `views` directory, create a new file named `space_insights.ejs`. This view should:\n\n1. Extend the partial header and footer to maintain consistent styling.\n2. Display the space's name and description at the top.\n3. Present a summary of user interactions, such as number of logins, recordings created, edits made, and deletions.\n4. Include a detailed table or list that chronologically displays each interaction with details like action type, user email, and timestamp.\n5. Add filters or search functionality to allow the space owner to easily navigate through interactions."
    },
    {
      "desc": "Ensure the new insights route is secured and only accessible by the space owner.",
      "prompt": "Verify that the new `/spaces/:id/insights` route in `routes/spaces.js` uses the `ensureLoggedIn` middleware to authenticate the user. Additionally, implement a check to confirm that the authenticated user's email matches the `ownerEmail` of the space being accessed. If the user is not the owner, respond with a 403 Forbidden status."
    },
    {
      "desc": "Update the Mongoose models if necessary to support additional queries for user interactions.",
      "prompt": "Review the existing `UserAction` mongoose model in `models/userAction.js` to ensure it includes all necessary fields to support detailed interaction insights. If additional fields or indexes are required for optimized querying (e.g., indexing `spaceId` and `actionType`), update the schema accordingly and apply the changes to the database."
    },
    {
      "desc": "Test the new insights functionality to ensure accurate and secure data presentation.",
      "prompt": "After implementing the new route and view, perform comprehensive testing to ensure that:\n\n1. Only the space owner can access the `/spaces/:id/insights` route.\n2. All user interactions related to the space are accurately fetched from the `UserAction` model.\n3. The `space_insights.ejs` view correctly displays the interactions in a clear and organized manner.\n4. Proper error messages and status codes are returned for unauthorized access or non-existent spaces.\n\nUse both manual testing and writing automated tests if applicable."
    }
  ]
}

```


# Apply

*aibuddy apply*

```
$ aibuddy apply
Running apply mode...
Switched to a new branch 'aiplan-1737044739314'
Created and switched to new branch: aiplan-1737044739314
Applying step: Create a new Express route to handle user interactions visualization
Running assistant mode...
Reminder: If you add new files, run 'aibuddy re' to regenerate the context.


Written file: routes/spaces/interactions.js
Written file: routes/spaces.js
Patch applied successfully.
Assistant mode complete.
Committed step: Create a new Express route to handle user interactions visualization
Running local installation...
Using 'git ls-files' to gather files with specified extensions...
Local installation complete.
Applying step: Fetch user interaction data from the UserAction model
Running assistant mode...
Reminder: If you add new files, run 'aibuddy re' to regenerate the context.
Written file: routes/spaces/interactions.js
Patch applied successfully.
Assistant mode complete.
...
Pushing changes to origin aiplan-1737044739314
remote: 
remote: Create a pull request for 'aiplan-1737044739314' on Gitxxx by visiting:        
remote:      https://.....................        
remote: 
To .................
 * [new branch]      aiplan-1737044739314 -> aiplan-1737044739314
Apply mode complete.
✔ [aiplan-1737044739314 L|✔] 

```




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

# Requirements

The POC works with an open ai account, so it will ask your for your open ai API key and store it in ~/.aibuddy config file

More providers will be added...

Requirements

```
nodejs
git
jq
bash
```

# Install

To install aibuddy, run this:

```
git clone https://github.com/dchapkine/aibuddy.sh.git
cd aibuddy.sh
chmod +x aibuddy-install.sh
./aibuddy-install.sh install
```

To update

```
cd aibuddy.sh
git pull
./aibuddy-install.sh install
```

# Ignore

By default all files in .gitignore will be excluded from the context when you run `aibuddy re`.

Furthermore, you can create an additional `.aibuddy.ignore` file to ignore files that are already versionned from the context.


# Example 1: adding a similar feature

```
aibuddy "use the same tags js library for sharedWithEmails input in views/spaces_new.ejs than in views/spaces_edit.ejs"
```
![image](https://github.com/user-attachments/assets/b4fabde4-16ac-4b1e-a0f0-cb04a7ef2ccc)

# Example 2: refactor code

```
aibuddy "move express routes out of index.js into dedicated route files under routes folder. Make sure each route file requires all needed dependencies to function independently and correctly. Update index.js to remove those route declarations and replace them with routes required from routes/* files"
```

*ignore the diff showing for confidentiality reasons*

# Example 3: refactor code

```
aibuddy "move mailgun code into utils/mailgun.js out of index.js and update all files using mailgun to require nad reuse utils/mailgun.js instead"
```

*ignore the diff showing for confidentiality reasons*
