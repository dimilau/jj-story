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

## Part 2:
On the top right of the "Scenes" section, add a "Save & Lock" button. When clicked, the "Undo", "Reset", "Save", "Save & Lock", "Merge with previous", "Split" buttons will be disabled. "Save & Lock" button will be changed to "Locked" with a lock lucide icon. The AI copilot chat appears on the right side of the page. 

### AI Copilot Chat for Visual Preferences Interview
Add an empty state title, explanatory text, and a prompt starter for "Start Interview". Use the system prompt at @docs\prompts\visual-preferences-interview-prompt.md to guide the interview process. The goal of the interview is to clarify all the visual details needed to generate consistent. When done, the copilot will call the `save_visual_details` tool with the JSON object. Our backend will save the visual details JSON in the R2 bucket with the key "picture-books/{id}/visual-details.json".
```JSON
{
  "visual_bible": [
    {
      "id": "C1", 
      "noun": "The cat", 
      "role": "...",
      "reference_sheet_prompt": "...",
      "appearance_description": "..."
    }
  ],
  "style_block": "[STYLE] Genre/Style Family, Medium/Texture, Line/Brushwork, Color Treatment, Quality/Format"
}
```
For the AI copilot chat UI, you can construct it using Shadcn's component:
```
InputGroup - For the message input with a send button
Button - For the send action
Card - For message containers/bubbles
Textarea - For multi-line message input
Scroll Area - For scrollable chat history
```
- Use "deepseek-v4-flash" model for the interview. 
- DeekSeek documentation:
  - https://api-docs.deepseek.com/guides/thinking_mode
  - https://api-docs.deepseek.com/guides/multi_round_chat
  - https://api-docs.deepseek.com/guides/json_mode
  - https://api-docs.deepseek.com/guides/tool_calls

### Visual & Style Section for Displaying Interview Results
The "Visual & Style" section appears above the "Scenes" section. It has two parts: "Visual Bible" and "[STYLE] Block". The "Visual Bible" part lists out the objects in the "visual_bible" array. Each object is displayed in a card, with a thumbnail on the left, and the "id", "noun" on the right. When clicking the card, a dialog will open. On the left of the dialog, there is a large thumbnail generated from the "reference_sheet_prompt". On the right of the dialog, display the "id", "noun", "role", "reference_sheet_prompt", and "appearance_description". The "[STYLE] Block" part displays the "style_block" string in a code block. On the top right of the "Visual & Style" section, there is a "Generate Visuals" button. When clicked, it will generate the image for each characters and props entry in the "visual_bible" using the "reference_sheet_prompt", and update the thumbnail in the card with the generated image. The "Generate Visuals" button can only be clicked after the interview is done and the visual details JSON is saved in the R2 bucket.

### Scene Section & Scene Prompt Generation
In the "Scenes" section, on the top right, there is a "Generate Prompts" button. When clicked, it will generate the prompt for each scene. To do this, user prompt will include: 
- The scene list in the "Scenes" section, in the format of "Scene {scene_id}: {scene_content}"
- The visual bible, in the format of "{id} ({noun}): {appearance_description}"
- The style block string, in the format of "[STYLE] Genre/Style Family, Medium/Texture, Line/Brushwork, Color Treatment, Quality/Format"

The system prompt will be:
```
You are a professional storyboard artist and cinematographer creating detailed image prompts for picture book illustration using FLUX.2 text-to-image generation.

## Your Task
Generate a high-quality image prompt for each scene provided. Each prompt must be completely self-contained, detailed, and optimized for FLUX.2 (T5-XXL text encoder).

## Output Format
Return a JSON array where each element has:
- "scene": The scene identifier (e.g., "Scene 1")
- "image_prompt": A detailed English description (single-line, no linebreaks)
- "reference_images": An array of character/prop IDs from the Visual Bible that appear in the prompt, in order of appearance (max 4 items)

Example:
[
  {
    "scene": "Scene 1",
    "image_prompt": "...",
    "reference_images": ["C1", "P1"]
  }
]

## Prompt Structure (6 Modules)
Every image_prompt must follow this structure in order:

1. **Style Base** — Start with the [STYLE] block provided, then add the scene's emotional tone
2. **Main Subject** — Complete appearance description of characters/props from the Visual Bible with pose, expression, and environmental interaction (wind, rain, etc.)
3. **Spatial Composition** — Shot type (wide, medium, close-up), subject position, background complete description
4. **Lighting & Atmosphere** — Primary light source + color temperature/mood + visual metaphor (if applicable)
5. **Camera Language** — Angle (low-angle, eye-level, overhead), lens effect (35mm, 85mm), composition rules (rule-of-thirds, leading lines, Dutch angle)
6. **Render Details** — Depth of field, film texture, material details, lighting effects

Write naturally as flowing English sentences with proper punctuation. Do NOT use comma-separated lists or bullet points.

## Critical Rules

**Complete Bible Descriptions**: Every time you reference a character, prop, or location from the Visual Bible, use its COMPLETE appearance description exactly as provided. Do NOT use pronouns (she, it, the cat) or shortcuts.

**Self-Contained Prompts**: Each image_prompt stands alone with no dependency on other prompts. No cross-references or relative descriptions.

**Static Frame Only**: Generate a single moment frozen in time. Avoid describing camera movement (zoom, pan, reveal) or multi-frame sequences.

**Reference Images Array**: List only the character/prop IDs actually mentioned in the image_prompt, up to 4 items. The array order should match appearance order in the prompt. Location elements (even if in the Visual Bible) should NOT be included in reference_images.

**Token Budget**: Keep image_prompts between 350-480 tokens. Prioritize core visual features (appearance, light, emotion) in the first 300 tokens.

## Lighting & Mood Mapping
Choose light + atmosphere based on scene emotion:
- **Tense/Mysterious**: Hard key light with sharp shadows + desaturated cool palette
- **Gentle/Nostalgic**: Soft diffused light + warm amber tones
- **Dark/Oppressive**: Overhead practical light with deep shadows + monochromatic cold palette
- **Magical/Otherworldly**: Volumetric rays + bioluminescence + ethereal gradient
- **Quiet/Melancholic**: Single diffused overhead + muted desaturated palette
- **Peaceful/Daily**: Soft overcast daylight + neutral warm-white tones

For complex emotions, combine elements from multiple rows.

## Visual Metaphor (Optional, Max 1 per prompt)
Only use if the scene has strong emotional weight AND a natural visual container (water, mirror, shadow, light, fog). Keep metaphors concrete and renderable:
- ✅ "the puddle reflects not the alleyway but a starless night sky"
- ✅ "her shadow on the wall shows not a human shape but a tree with spreading branches"
- ❌ "symbolizing her inner conflict" (too abstract)

Must use one of these anchoring strategies:
1. **Anchor to Reality** — Establish physical container first, then describe what's inside
2. **Layer Isolation** — Metaphor in background/shadow/reflection only, subject stays literal per Bible
3. **Emotional Composite** — Metaphor + specific light + specific color palette combo

## Important Constraints
- Do NOT add mood words (cozy, whimsical, emotional, ominous) to the [STYLE] block itself—only to Module 1 after [STYLE]
- Do NOT use f-stop numbers or ISO values; describe visual effects instead
- Do NOT use "camera slowly zooms" or "pull back to reveal"—these require time
- Always preserve exact character/prop descriptions, only adjust grammar/prepositions for flow
```

Example of the JSON returned from the LLM for the generated prompts:
```JSON
[
    {
        "scene": "Scene 1",
        "image_prompt": "Heartwarming children's storybook art style, soft watercolor texture, gentle pencil linework, muted and soothing color palette, cozy atmosphere, high-quality digital illustration, whimsical and emotional. A cat (image 0), tail held high, curious expression, sitting on a wide, flat windowsill make of smooth, light-grained oak wood, sunlit by morning rays, with clean architectural lines and a clear glass windowpane, looking down at a girl (image 1), who is drawing at a desk with colorful drawing pens (image 2); the cat's head tilted, one paw resting on the windowsill edge. Medium shot, cat in left foreground, girl in right midground, inside a cozy, minimalist room with warm cedar-plank flooring, smooth off-white plaster walls, unadorned wooden furniture, and a gentle, inviting atmosphere. Soft diffused daylight from the window, warm golden rim light on the cat's fur; warm amber color temperature, clean and peaceful atmosphere, quiet mood. Eye-level angle, 50mm lens natural perspective, leading lines from window frame and desk edge directing eye to the girl's hands. Shallow depth of field with soft background bokeh on the room, fine watercolor paper texture, gentle highlights on cat's fur, delicate fabric and skin rendering.",
        "reference_images": ["C2", "C1", "P1"]
    },
]```

All characters and props in the Visual Bible is assumed to have reference images. In the "image_prompt" field, when referencing characters and props from the visual bible, use "image ID" (image 0, image 1, etc.) format, where ID corresponds to the index of the item in the "reference_images" array, and the item value in the "reference_images" array corresponds to the ID of the character, prop in the visual bible. The "reference_images" array will be referenced when generating the scene image to ensure that the correct visual elements are feed in the to the correct input_image parameter for the FLUX.2 klein-9b model.

There can only be up to 4 reference images for each scene, so if there are more than 4 different characters, props with reference image available to be referenced from the visual bible in the image prompt, the AI follows a priority order to determine which ones to include as reference images. The priority order is as follows:

1. Main character(s)
2. Key props
3. Secondary characters
4. The rest of the referenced elements in the prompt just be described using their respective "Appearance Description".

For location and setting elements, since they don't have reference images, they will just be described using their respective "Appearance Description" in the image prompt.

The JSON will be saved in the R2 bucket with the key "picture-books/{id}/scene-prompts.json". After the prompts are generated, the page will display the generated prompt for each scene in the "Scenes" section, and also update the "Generate Prompts" button to "Prompts Generated" with a check lucide icon, and disable the button.

#### Scenes List Item UI
Each scene item in the "Scenes" section will have the following UI elements.
- scene_id
- scene_content
- after the "Generate Prompts" button is clicked and the prompts are generated:
  - Generated prompt text - inside a code block with the ability to copy the prompt text to clipboard.
  - Reference images list (if any) - will be displayed as a horizontal list of Shadcn badges with the "Image {index}: {ID} ({noun})" of the visual bible item.
  - Generate Image button - when clicked, it will generate the image for the scene using the generated prompt and the reference images.
  - After the image is generated, it will be displayed somewhere in the scene item card.

### Amendments
- Inside Scene Item Card, use Shadcn collapsible component, to show & hide the generated prompt text & reference images list.

