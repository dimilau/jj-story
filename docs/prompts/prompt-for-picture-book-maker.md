## Part 1
- Create a new page at "/admin/picture-books".
- There should be a "New Picture Book" button at the top of the page. When clicked, a dialog should open, in the dialog there should be a field "Select your story" using Shadcn combobox component with filtering. Beside the combobox there should be a "Proceed".
- When the "Proceed" button is clicked, user will be brought to the "edit" page at "/admin/picture-books/{id}/edit" page. The story that the user selected in the combobox will be sent to DeepSeek for breaking into "scenes" - A scene is a group of one or more consecutive sentences that would naturally appear together in a single illustration. When the LLM is processing, use the Shadcn skeleton component.
- When LLM has done, it will return the results in JSON. The "edit" page will list out the result in the page, replacing the skeleton with the list of "scenes".
- For each "scene", there is "Duplicate" button. For each "scene" starting from the second, there is a "Merge with previous" button.
- On the top right of the "Scenes" section, there is an "Undo" and "Reset" button.

Note:

- I've added the DEEPSEEK_API_KEY to the .dev.vars and secrets.json.example files. 
- deekseek open api documentation "docs\documentation\deepseek-documentation.md"
- use "deepseek-v4-flash" model
- pass the story to deepseek as a user prompt, and add a system prompt:
```
You are a helpful assistant for breaking down the story into scenes for picture book illustration. A scene is a group of one or more consecutive sentences that would naturally appear together in a single illustration. User will provide a story, and your task is to break down the story into scenes and return the results in JSON format: a JSON array of scenes, each scene is an object with "scene_id" and "scene_content". No explanation is needed, only return the JSON array.
```

## Part 1: Fix
Please make the following changes to the "admin/picture-books/": In the "New Picture Book" dialog, change the label of the button from "Proceed" to "Generate". After the user clicks the "Generate" button, the LLM will start processing the story and generating the scenes. During this time, the "Generate" button should be disabled, the button text should change to "Generating..." with a loading spinner.
Example shadcn button with spinner:
```JavaScript
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SpinnerButton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Button disabled size="sm">
        <Spinner data-icon="inline-start" />
        Loading...
      </Button>
    </div>
  )
}
```
Once the LLM returns the generated scenes JSON format, create a new entry with a new random UUID as the id in the "picture_books" table, do not use the same ID as the story because each story can have multiple picture books. Store the title of the story. Get the id we just created, and use it to form the R2 key "picture-books/{id}/scenes.json", which will be used to store the generated scenes JSON in the R2 bucket, make sure to store this R2 key in the database entry we just created.

Cloudflare R2 documentation can be found at ".agents\skills\cloudflare\references\r2"

Redirect the user to the "edit" page at "/admin/picture-books/{id}/edit" where the generated scenes will be listed.

In the admin/picture-books/{id}/edit page, in the "Scenes" section, for each scene card:
- Remove the "Duplicate" button & feature.
- After each full stop in the "scene_content" of each SCENE card, except the full stop at the end, add a button with the "scissors" lucide icon, when clicked it will split the scene_content into two at that point. The first part will remain in the current scene card, and the second part will be moved to a new scene card right after the current card. The new card's scene_id will be the current card's scene_id + 1, and the scene_id of all the following cards will also increase by 1.
- Add a "Save" button, when clicked, it will update the current list of scenes to the database. 

## Part 1: Fix 2
- In @admin.picture-books.tsx, Combobox, when a story is selected, do not show it's ID to user, it is meaningless for user.
- When LLM is done, users are brought to the /admin/picture-books/{id}/edit(I can see the URL in the browser's address bar), but the content is still at "/admin/picture-books". I need to do a F5 refresh to see the content is in the page.
- Please show the list of picture books in "/admin/picture-books".