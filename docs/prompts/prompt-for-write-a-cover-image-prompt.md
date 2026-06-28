# Task
Given the story text for the book:
${storyText}

Given the title of the book is: "${pictureBook.title}"

Given the visual bible for the story:
${visualBible}

## Art style
Given the art style for the story: "${artStyle}"

Before writing the prompt, fill the "reference_images" array with visual bible element IDs that
    1.Initials of "C" or "P"
    2.appear in the cover image visually
    3.sorted by importance to the cover image
    4.limited to 4 elements.`;

Write an image prompt for the cover image of the book in "prompt". The cover image should not include text. When describing elements (Characters, Props, Locations), follow this prioritization and referencing scheme:
  * 1. Element is in the \`reference_images\` array: refer to it as \`{noun} (image N)\`(N is the 0-based index in the array). Do NOT describe its appearance; the reference image will be used for that.
  * 2. Element is not in \`reference_images\` but is in the Visual Bible: refer to it using its \`noun\`. Please describe its appearance/setting using its \`appearance_description\`.
  * 3. If the element is not in either, describe its role in the scene and its appearance in explicit.

## Output
JSON object with two keys:
- "prompt"
- "reference_images"  