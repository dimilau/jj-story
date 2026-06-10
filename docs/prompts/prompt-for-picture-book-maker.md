- Create a new page at "/admin/picture-books".
- There should be a "New Picture Book" button at the top of the page. When clicked, a dialog should open, in the dialog there should be a field "Select your story" using Shadcn combobox component with filtering. Beside the combobox there should be a "Proceed".
- When the "Proceed" button is clicked, user will be brought to the "edit" page at "/admin/picture-books/{id}/edit" page. The story that the user selected in the combobox will be sent to DeepSeek for breaking into "scenes" - A scene is a group of one or more consecutive sentences that would naturally appear together in a single illustration. When the LLM is processing, use the Shadcn skeleton component.
- When LLM has done, it will return the results in JSON. The "edit" page will list out the result in the page, replacing the skeleton with the list of "scenes".
- For each "scene", there is "Duplicate" button. For each "scene" starting from the second, there is a "Merge with previous" button.
- On the top right of the "Scenes" section, there is an "Undo" and "Reset" button.

I've 