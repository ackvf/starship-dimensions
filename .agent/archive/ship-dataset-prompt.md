# 🚀 RESEARCH AGENT PROMPT — SPACESHIP DATASET GENERATION

You are a research-grade data collection agent. Your task is to produce a large, structured dataset (hundreds to thousands of entries) of **notable spaceships** across major science fiction universes.

This dataset will power a website that compares spaceship sizes across universes.

You must strictly follow the schema and formatting rules below.

---

## 🎯 OBJECTIVE

Produce a **CSV file** containing ships from as many sci-fi universes as possible, including but not limited to:

* Star Wars
* Star Trek
* Warhammer 40,000
* Warhammer Fantasy / Age of Sigmar (if spacefaring variants exist)
* Dune
* Alien / Prometheus
* Battlestar Galactica
* Stargate
* The Expanse
* Babylon 5
* Doctor Who
* Transformers
* Mass Effect
* Halo
* StarCraft
* Metroid
* Dead Space
* Wing Commander
* Elite Dangerous
* Starfield
* Destiny
* EVE Online
* Outer Wilds
* No Man's Sky
* Firefly
* Foundation
* Farscape
* Andromeda
* The Orville
* The Culture
* The Hitchhiker’s Guide to the Galaxy
* Independence Day
* Avatar
* Titan AE
* Guardians of the Galaxy
* Cowboy Bebop
* Legend of the Galactic Heroes
* Mobile Suit Gundam
* Macross
* Lost in Space
* Red Dwarf
* Any other major sci-fi property with named spacecraft

Add additional major sci-fi universes if relevant.

You must include:

* Capital ships
* Battleships
* Carriers
* Dreadnoughts
* Frigates
* Destroyers
* Cruisers
* Corvettes
* Fighters
* Transports
* Freighters
* Science vessels
* Colony ships
* Unique legendary ships

---

# 📦 REQUIRED OUTPUT FORMAT

You must output a **CSV**.

Each row represents one ship.

Each ship must follow this schema:

## Required Fields

* `name` (string)
* `universe` (string)
* `lengthMeters` (positive number, meters only)
* `heightMeters` (optional, positive number, meters only, required if `images.main` is missing or aspect ratio is not correct)
* `tags` (JSON array of strings, non-empty)
* `images.main` (absolute https URL to a 2D side-view image)

## Optional Fields

* `images.gallery` (JSON array of absolute https URLs)
* `links` (JSON array of `{ "label": "...", "url": "https://..." }`)
* `description` (markdown)

---

# 📏 LENGTH RULES

* Use canonical length when available.
* If multiple variants exist, use the most widely recognized version.
* Convert units to meters.
* If ship length is unknown but estimable from canon, use best documented estimate.
* Do NOT invent dimensions.

---


# 🖼 IMAGE & LINK RULES (CRITICAL)

* `images.main` and all `links.url` MUST:
  * Be absolute `https://` URLs
  * Be working and loadable at the time of dataset creation (no 404, no login required, no dead links)
  * Be a true side profile view (for images.main)
  * Not be fan art unless no official image exists
  * Not contain multiple ships (unless it's a formation of identical ships)
  * Not be behind login
  * Not be a thumbnail (unless no full-size image exists)
  * Not contain text or watermarks

**You must manually or programmatically verify that every image and link is valid and loads successfully.**

Preferred sources:

* Official franchise media sites
* Wikis (Wookieepedia, Memory Alpha, Halopedia, etc.)
* Art books
* Official promotional renders

Avoid:

* Pinterest
* DeviantArt (unless no alternative exists)
* Broken or dead links

---

# 🏷 TAGGING RULES

Tags must:

* Be lowercase
* Be concise
* Include at least:

  * ship class/type (e.g., "star destroyer", "frigate", "fighter")
  * faction
  * role (e.g., "capital ship", "carrier", "exploration")
  * tech level if relevant ("ancient", "forerunner", "imperial", etc.)

Example:

```
["capital ship", "imperial", "star destroyer", "warship"]
```

---

# 📝 DESCRIPTION REQUIREMENTS

`description` must be markdown and include:

* Ship overview
* Role in universe
* Faction
* Canonical length (in meters)
* Notable appearances
* Historical significance (if any)
* Comparison context (e.g., “one of the largest ships in X”)
* Image gallery 
* Links to official sources, wikis, or media

The description itself must pose as a stand-alone human-readable document that can be viewed outside of the application with exhaustive information about the ship, links and a gallery and incorporating all structured fields (using the same links as defined earlier).

---

# 🧠 DATA QUALITY RULES

* No duplicates.
* No unnamed generic ships (must have specific class or proper name).
* Avoid minor one-off background ships unless notable.
* Prioritize ships with canonical size.
* Maintain consistent universe naming:

  * "Star Wars"
  * "Star Trek"
  * "Warhammer 40,000"
  * etc.

---

# 📊 SCALE REQUIREMENT

Minimum target: **200 ships**

Ideal target: **400+ ships**

---

# 🧾 CSV FORMAT RULES

* First row must be header row.
* Escape commas properly.
* JSON arrays must be valid JSON inside CSV cells.
* `description` must preserve markdown formatting.

---

# 🚫 DO NOT

* Invent ships.
* Fabricate sizes.
* Use relative image paths.
* Leave required fields empty.
* Use placeholder URLs.
* Use inconsistent units.

---


# ✅ VALIDATION CHECKLIST

Before finalizing:

* [ ] All ships have valid lengthMeters > 0
* [ ] Provide a report that all images are valid and loadable one by one. (test every link)
* [ ] All links.url fields are https and loadable (test every link)
* [ ] tags is valid JSON array
* [ ] No duplicate ships
* [ ] CSV parses correctly
* [ ] All descriptions are non-empty markdown

---

# 📤 OUTPUT INSTRUCTIONS

Return ONLY the CSV.

Do not explain.
Do not summarize.
Do not include commentary.
Do not wrap in code blocks.
