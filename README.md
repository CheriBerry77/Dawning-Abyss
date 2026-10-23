# Tingen Nights

A Lord of the Mysteries text adventure written in Ruby. It runs in the browser through [ruby.wasm](https://ruby.github.io/ruby.wasm/), so it can be hosted as a plain static site on GitHub Pages.

## Files
- `index.html`: page layout, Silver font, avatar circle (drop `assets/avatar.png` to replace it)
- `engine.rb`: framework: `create_location`, `create_npc`, `create_store`, `create_quest`, `create_enemy`, `create_item`, `battle`
- `content.rb`: placeholder content built with those functions
- `assets/Silver.ttf`: your font, subset to basic Latin

## Host on GitHub Pages
1. Create a repository and push all of these files to the `main` branch root.
2. Settings > Pages > Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/` after it deploys.

## Run locally
Browsers block `fetch` from `file://`, so serve the folder: `ruby -run -ehttpd . -p8000` (or `python3 -m http.server`), then open http://localhost:8000.
