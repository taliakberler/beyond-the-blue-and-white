# Content guidelines

> **Draft:** a starting point for the project team to revise. These are working standards, not final editorial policy.

*Beyond the Blue and White* presents Black history at UNC Chapel Hill: the sites, events, and people significant to that history around campus. Visitors will treat what they read at a stop as the record of that place, so every stop must be accurate, sourced, and written with care for the people it describes.

---

## Core principles

1. **Verify everything.** Every factual claim (names, dates, places, events, quotations) should trace back to a source listed in that stop's `sources`. If a claim can't be sourced, leave it out or clearly mark it as uncertain or contested.
2. **Center people, not only buildings.** A stop exists because of what people did, endured, or built there. Name them wherever the record allows, and describe them as full people, not only in relation to the University.
3. **Name who acted.** Prefer active voice that says who made decisions and who carried them out ("the trustees voted to…"), rather than phrasing that hides responsibility ("it was decided…").
4. **Show uncertainty honestly.** Archival records about Black life at Southern institutions are often incomplete, or were written by people who didn't value those lives. Say what is known, what isn't, and where the gaps come from.
5. **Hand off to the full story.** Each stop is a short introduction. Sources and links should point visitors to deeper reading.
6. **No AI-generated history.** Historical text, names, dates, and citations must be researched and written by people. AI tools may help with formatting or code, but not with historical content.

---

## Language

- Use person-first language for enslavement: "enslaved people" or "enslaved workers," and "enslavers," rather than "slaves" and "masters," unless you're quoting a source directly.
- Capitalize "Black" when referring to people and communities.
- Put direct quotations from historical sources in quotation marks with a citation, including quotations that contain offensive language. Decide as a team whether to include such language in full, abbreviate it, or add a content note.
- Use the names and terms people and organizations used for themselves, and explain historical terms where needed.
- Write for a general audience reading on a phone while standing outdoors. Keep paragraphs short and avoid jargon.

### Suggested lengths

| Field | Target |
|---|---|
| `summary` | 1–2 sentences (under 40 words) |
| `history` | 2–5 short paragraphs (about 150–400 words total) |
| `people[].description` | One line (under 20 words) |
| `images[].caption` | 1 sentence |

---

## Sources and citations

- Prefer **primary sources** (archival documents, photographs, oral histories, newspapers of the time) and peer-reviewed or institutionally published scholarship.
- Useful starting points include the University's archives and special collections, published histories of the University, oral history collections, and records held by local community organizations.
- Each source entry needs enough detail for someone else to find it: author or creator, title, date, the repository or publisher, and a collection or item ID where one exists. Add a stable `url` when there is one.
- If two sources disagree, say so in the history text and cite both.

---

## Images and rights

- **Use an image only if you have the right to.** Check the holding repository's terms. Public domain and openly licensed (e.g. CC BY) images are simplest. Some archival images need a permission request.
- **Credit every image** the way the holding repository asks, including the item or collection ID.
- **Store images in `images/`.** Never link directly to images on other sites.
- **Write meaningful `alt` text** that describes what the image shows for someone who can't see it. "Photograph of …" is fine; "image" is not. Keep it under about 150 characters, and put context the caption already gives in the caption, not the alt text.
- Treat images that show people in distress, violence, or degradation with particular care. Consider whether the image is needed, and frame it in the caption.

---

## Review before publishing

Before a stop goes live:

1. **Fact check:** a second person checks every claim against the cited sources.
2. **Subject review:** where possible, invite review from historians of the topic and from descendants or community members connected to the people and events described.
3. **Accessibility check:** every image has alt text, captions make sense on their own, and the text reads clearly on a phone.
4. **Placeholder check:** set `"placeholder": false` on the stop so the badge disappears, and replace the placeholder text and images.
5. **Log it:** add an entry to [PROCESS_LOG.md](../PROCESS_LOG.md) noting the stop was added and who reviewed it.

## Corrections

Errors will happen. When one is reported:

- Fix it in `data/stops.json`.
- Record the correction, the date, and the source that prompted it in [PROCESS_LOG.md](../PROCESS_LOG.md).
- If a stop's `id` must change, regenerate and reprint that stop's QR sign.

Consider adding a "Report a correction" contact (an email address or form link) to the map once there's an owner to receive reports.
