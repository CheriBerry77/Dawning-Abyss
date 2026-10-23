# engine.rb : game framework for "Tingen Nights" (runs in the browser via ruby.wasm)
# Content (places, NPCs, quests, ...) lives in content.rb and is built with the create_* functions below.
require "js"

PATHWAYS = [
  ["Fool", "Seer"], ["Error", "Marauder"], ["Door", "Apprentice"], ["Visionary", "Spectator"],
  ["Sun", "Bard"], ["Tyrant", "Sailor"], ["White Tower", "Reader"], ["Hanged Man", "Secrets Supplicant"],
  ["Darkness", "Sleepless"], ["Death", "Corpse Collector"], ["Twilight Giant", "Warrior"], ["Demoness", "Assassin"],
  ["Red Priest", "Hunter"], ["Hermit", "Mystery Pryer"], ["Paragon", "Savant"], ["Wheel of Fortune", "Monster"],
  ["Mother", "Planter"], ["Moon", "Apothecary"], ["Abyss", "Criminal"], ["Chained", "Prisoner"],
  ["Black Emperor", "Lawyer"], ["Justiciar", "Arbiter"]
]

Item  = Struct.new(:id, :name, :desc, :heal)
Place = Struct.new(:id, :name, :art, :exits, :stock)   # stock (Hash item_id => price) is set only for stores
Npc   = Struct.new(:name, :place, :dialogue)
Enemy = Struct.new(:name, :place, :hp, :atk, :gold)
Quest = Struct.new(:id, :title, :giver, :objective, :reward)
Hero  = Struct.new(:pathway, :role, :hp, :max_hp, :atk, :gold, :inv, :quests, :place)

ITEMS = {}; PLACES = {}; NPCS = {}; ENEMIES = {}; QUESTS = {}
$hero = nil; $foe = nil; $mode = :select; $start = nil; $start_items = {}

# ---------------------------------------------------------------- UI bridge
module UI
  DOC = JS.global[:document]
  def self.el(id)
    DOC.getElementById(id)
  end

  def self.esc(s)
    s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
  end

  # Static window: every character gets a fixed-width cell so the proportional Silver font keeps ASCII art aligned.
  def self.view(art, title = "", spaced = false)
    rows = art.lines.map { |l| "<div>" + l.chomp.chars.map { |c| "<i>#{c == ' ' ? '&nbsp;' : esc(c)}</i>" }.join + "</div>" }
    el("view")[:innerHTML] = rows.join
    el("view")[:className] = spaced ? "spaced" : ""
    el("loc")[:textContent] = title
  end

  def self.print(text, css = "")
    log = el("log")
    line = DOC.createElement("div")
    line[:className] = css
    line[:textContent] = text
    log.appendChild(line)
    log[:scrollTop] = log[:scrollHeight]
  end

  def self.clear_log
    el("log")[:innerHTML] = ""
  end

  def self.hud
    h = $hero
    el("hud")[:textContent] = h ? "#{h.role} (#{h.pathway}) | HP #{h.hp}/#{h.max_hp} | Gold #{h.gold}" : ""
  end

  def self.on_command(&handler)
    input = el("cmd")
    input.addEventListener("keydown") do |event|
      if event[:key].to_s == "Enter"
        text = input[:value].to_s.strip
        input[:value] = ""
        handler.call(text) unless text.empty?
      end
    end
    input.focus
  end
end

# ---------------------------------------------------------------- creation functions
def create_item(id, name, desc = "", heal: 0)
  ITEMS[id] = Item.new(id, name, desc, heal)
end

# Instanced location. Reach it with "go <name>" from any location that lists it in exits:.
def create_location(id, name, art:, exits: [])
  PLACES[id] = Place.new(id, name, art, exits, nil)
end

# NPC: can only be spoken to while the hero is in `location`. dialogue is a String or an Array of Strings.
def create_npc(name, location, dialogue)
  NPCS[name] = Npc.new(name, location, Array(dialogue))
end

# Store = instanced location + a keeper NPC. stock maps item ids to prices. Talk to the keeper, then "buy <item>".
def create_store(id, name, art:, exits:, keeper:, dialogue:, stock:)
  PLACES[id] = Place.new(id, name, art, exits, stock)
  create_npc(keeper, id, dialogue)
end

def create_enemy(name, location, hp:, atk:, gold: 0)
  ENEMIES[name] = Enemy.new(name, location, hp, atk, gold)
end

# objective: { type: :defeat, enemy: "Name" }  (reward on victory)
#         or { type: :deliver, item: :item_id } (give it to the giver NPC). reward: { gold: 10, items: [:id] }
def create_quest(id, title, giver:, objective:, reward:)
  QUESTS[id] = Quest.new(id, title, giver, objective, reward)
end

def set_start(place_id, items = {})
  $start = place_id
  $start_items = items
end

# ---------------------------------------------------------------- helpers
def match(list, text)
  t = text.downcase
  list.find { |x| x.name.downcase.include?(t) } unless t.empty?
end

def give_item(id, n = 1)
  $hero.inv[id] = $hero.inv.fetch(id, 0) + n
end

def take_item(id)
  $hero.inv[id] -= 1
  $hero.inv.delete(id) if $hero.inv[id] <= 0
end

def here
  PLACES[$hero.place]
end

def hp_bar(v, m, n = 24)
  f = [[v, 0].max * n / m, n].min
  "[" + "#" * f + "-" * (n - f) + "]"
end

# ---------------------------------------------------------------- places
def show_place
  UI.view(here.art, here.name)
  UI.hud
end

def describe_place
  p = here
  UI.print("Exits: " + (p.exits.map { |e| PLACES[e].name }.join(", ")), "dim")
  npcs = NPCS.values.select { |n| n.place == p.id }.map(&:name)
  foes = ENEMIES.values.select { |e| e.place == p.id }.map(&:name)
  UI.print("People here: #{npcs.join(', ')}", "dim") unless npcs.empty?
  UI.print("Enemies here: #{foes.join(', ')}", "dim") unless foes.empty?
  UI.print("This is a store. Talk to the keeper, then use: buy <item>", "dim") if p.stock
end

def travel(text)
  dest = here.exits.map { |e| PLACES[e] }.find { |pl| pl.name.downcase.include?(text.downcase) || pl.id.to_s == text.downcase }
  return UI.print("You can't go there from here. (Exits: #{here.exits.map { |e| PLACES[e].name }.join(', ')})") unless dest
  $hero.place = dest.id
  show_place
  UI.print("You travel to #{dest.name}.")
  describe_place
end

# ---------------------------------------------------------------- NPCs, quests, stores
def objective_text(o)
  o[:type] == :defeat ? "Defeat #{o[:enemy]}." : "Bring 1 #{ITEMS[o[:item]].name} to the quest giver."
end

def complete_quest(q)
  $hero.quests[q.id] = :done
  r = q.reward
  $hero.gold += r[:gold].to_i
  Array(r[:items]).each { |i| give_item(i) }
  names = Array(r[:items]).map { |i| ITEMS[i].name }
  UI.print("[Quest complete] #{q.title}. Reward: #{r[:gold].to_i} gold#{names.empty? ? '' : ', ' + names.join(', ')}.", "good")
  UI.hud
end

def talk(text)
  npc = NPCS.values.find { |n| n.place == $hero.place && n.name.downcase.include?(text.downcase) } unless text.empty?
  return UI.print("There is nobody like that here.") unless npc
  UI.print("#{npc.name}: \"#{npc.dialogue.sample}\"")
  QUESTS.each_value do |q|
    next unless q.giver == npc.name
    case $hero.quests[q.id]
    when nil
      $hero.quests[q.id] = :active
      UI.print("[Quest accepted] #{q.title}: #{objective_text(q.objective)}", "good")
    when :active
      o = q.objective
      if o[:type] == :deliver && $hero.inv[o[:item]].to_i > 0
        take_item(o[:item])
        complete_quest(q)
      else
        UI.print("[Quest in progress] #{q.title}: #{objective_text(o)}", "dim")
      end
    end
  end
  return unless here.stock && npc.place == here.id
  UI.print("For sale:", "dim")
  here.stock.each { |id, price| UI.print("  #{ITEMS[id].name} - #{price} gold (#{ITEMS[id].desc})", "dim") }
end

def buy(text)
  return UI.print("There is no store here.") unless here.stock
  id = here.stock.keys.find { |i| ITEMS[i].name.downcase.include?(text.downcase) } unless text.empty?
  return UI.print("The shop doesn't sell that.") unless id
  price = here.stock[id]
  return UI.print("You need #{price} gold.") if $hero.gold < price
  $hero.gold -= price
  give_item(id)
  UI.print("You bought #{ITEMS[id].name} for #{price} gold.", "good")
  UI.hud
end

def quests_list
  active = QUESTS.values.select { |q| $hero.quests[q.id] == :active }
  return UI.print("No active quests.") if active.empty?
  active.each { |q| UI.print("#{q.title}: #{objective_text(q.objective)} (from #{q.giver})") }
end

# ---------------------------------------------------------------- items
def inventory
  return UI.print("Your bag is empty.") if $hero.inv.empty?
  UI.print("Bag: " + $hero.inv.map { |id, n| "#{ITEMS[id].name} x#{n}" }.join(", "))
end

def use_item(text)
  id = $hero.inv.keys.find { |i| ITEMS[i].name.downcase.include?(text.downcase) } unless text.empty?
  return UI.print("You don't have that.") unless id
  return UI.print("#{ITEMS[id].name} can't be used right now.") if ITEMS[id].heal <= 0
  take_item(id)
  $hero.hp = [$hero.hp + ITEMS[id].heal, $hero.max_hp].min
  UI.print("You use #{ITEMS[id].name} and recover #{ITEMS[id].heal} HP.", "good")
  UI.hud
  true
end

# ---------------------------------------------------------------- battle
BATTLE_ART = <<~'ART'
                                  .-""""-.
                                 /  ?  ?  \
                                |    __    |
                                 \  \__/  /
                                  '------'
ART

# Start a turn-based battle. In battle the text box accepts: fight | item <name> | run
def battle(enemy)
  e = enemy.is_a?(Enemy) ? enemy : ENEMIES[enemy]
  $foe = { def: e, hp: e.hp }
  $mode = :battle
  show_battle
  UI.print("#{e.name} blocks your path! Commands: fight, item <name>, run", "warn")
end

def show_battle
  e = $foe[:def]; h = $hero
  UI.view("  #{e.name}\n  HP #{hp_bar($foe[:hp], e.hp)} #{[$foe[:hp], 0].max}/#{e.hp}\n\n" + BATTLE_ART + "\n  #{h.role}\n  HP #{hp_bar(h.hp, h.max_hp)} #{[h.hp, 0].max}/#{h.max_hp}\n", "BATTLE")
  UI.hud
end

def end_battle
  $mode = :explore
  show_place
end

def win_battle
  e = $foe[:def]
  $hero.gold += e.gold
  UI.print("#{e.name} is defeated! You gain #{e.gold} gold.", "good")
  QUESTS.each_value do |q|
    o = q.objective
    complete_quest(q) if $hero.quests[q.id] == :active && o[:type] == :defeat && o[:enemy] == e.name
  end
  end_battle
end

def foe_turn
  e = $foe[:def]
  d = rand(1..e.atk)
  $hero.hp -= d
  UI.print("#{e.name} hits you for #{d} damage.", "warn")
  return unless $hero.hp <= 0
  UI.print("You black out and wake up where your journey began.", "warn")
  $hero.hp = $hero.max_hp
  $hero.place = $start
  end_battle
end

def battle_command(verb, arg)
  case verb
  when "fight", "attack"
    d = rand(($hero.atk - 2)..($hero.atk + 2))
    $foe[:hp] -= d
    UI.print("You strike #{$foe[:def].name} for #{d} damage.")
    return win_battle if $foe[:hp] <= 0
    foe_turn
  when "item", "use"
    foe_turn if use_item(arg)
  when "run"
    if rand < 0.5
      UI.print("You slip away!")
      return end_battle
    end
    UI.print("You couldn't get away!", "warn")
    foe_turn
  else
    UI.print("In battle you can: fight, item <name>, run")
  end
  show_battle if $mode == :battle
end

# ---------------------------------------------------------------- game flow
def show_select
  rows = PATHWAYS.each_with_index.map { |(path, role), i| "#{(i + 1).to_s.rjust(2)} #{path} - #{role}".ljust(34) }
  half = rows.size / 2
  lines = (0...half).map { |i| rows[i] + rows[i + half] }
  UI.view("  CHOOSE THE SEQUENCE 9 POTION YOU WILL DRINK\n\n" + lines.join("\n") + "\n", "Pathways", true)
  UI.print("Which Pathway will you walk? Type a number (1-22) or a name, then press Enter.")
end

def select_pathway(text)
  i = text =~ /\A\d+\z/ ? text.to_i - 1 : PATHWAYS.index { |pa, ro| pa.downcase.include?(text.downcase) || ro.downcase.include?(text.downcase) }
  return UI.print("No such Pathway. Type 1-22 or a Pathway name.") unless i && i >= 0 && PATHWAYS[i]
  path, role = PATHWAYS[i]
  $hero = Hero.new(path, role, 40, 40, 6, 20, {}, {}, $start)
  $start_items.each { |id, n| give_item(id, n) }
  $mode = :explore
  UI.clear_log
  UI.print("You drink the potion and become a #{role} of the #{path} Pathway. Type help for commands.", "good")
  show_place
  describe_place
end

def help_text
  UI.print("Commands: look | go <place> | talk <npc> | fight <enemy> | buy <item> | inv | use <item> | quests | status | help", "dim")
end

def explore_command(verb, arg)
  case verb
  when "help" then help_text
  when "look" then show_place; describe_place
  when "go", "travel", "enter" then travel(arg)
  when "talk", "speak" then talk(arg)
  when "buy" then buy(arg)
  when "inv", "inventory", "bag" then inventory
  when "use" then use_item(arg)
  when "quests", "quest" then quests_list
  when "status" then UI.print("#{$hero.role} (#{$hero.pathway}) Seq 9 | HP #{$hero.hp}/#{$hero.max_hp} | ATK #{$hero.atk} | Gold #{$hero.gold}")
  when "fight"
    foe = ENEMIES.values.find { |e| e.place == $hero.place && e.name.downcase.include?(arg.downcase) } unless arg.empty?
    foe ? battle(foe) : UI.print("Fight whom? (Enemies here: #{ENEMIES.values.select { |e| e.place == $hero.place }.map(&:name).join(', ')})")
  else UI.print("Unknown command. Type help.")
  end
end

def dispatch(line)
  UI.print("> #{line}", "echo")
  verb, arg = line.split(" ", 2)
  verb = verb.downcase; arg = arg.to_s.strip
  case $mode
  when :select then select_pathway(line)
  when :battle then battle_command(verb, arg)
  else explore_command(verb, arg)
  end
  UI.hud
end

def start_game
  UI.clear_log
  UI.on_command { |line| dispatch(line) }
  show_select
end
