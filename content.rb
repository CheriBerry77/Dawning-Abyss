# content.rb : placeholder content. Replace the names, dialogue and images with the real thing.
# Location images are PNGs in images/ (a missing file shows a labelled placeholder panel).
# Everything is built with the create_* functions from engine.rb.

create_item :potion, "Healing Potion", "Restores 20 HP.", heal: 20
create_item :bread, "Rye Bread", "Restores 2 HP.", heal: 2
create_item :monster_formula, "Sequence 9 - Monster Formula", "The potion formula of a Sequence 9 - Monster."

create_location :iron_cross_street, "Iron Cross Street", image: "iron_cross_street.png", exits: [:smyrin_bakery, :red_moonlight_street, :evil_dragon_bar]

create_location :red_moonlight_street, "Red Moonlight Street", image: "red_moonlight_street.png", exits: [:iron_cross_street, :saint_selena_cathedral, :folk_herb_store]

create_location :saint_selena_cathedral, "Saint Selena's Cathedral", image: "saint_selena_cathedral.png", exits: [:red_moonlight_street]

create_location :evil_dragon_bar, "Evil Dragon Bar", image: "evil_dragon_bar.png", exits: [:iron_cross_street, :suspicious_stall]

create_store :suspicious_stall, "Suspicious Stall", image: "evil_dragon_bar.png", exits: [:evil_dragon_bar], keeper: "Shady Man", dialogue: ["That old page? Just a bunch of useless ramblings. Take it if you want."], stock: { monster_formula: 5}

create_store :smyrin_bakery, "Smyrin Bakery", image: "iron_cross_street.png", exits: [:iron_cross_street],
             keeper: "Mrs. Smyrin", dialogue: ["Hello, dearie. Care to buy a loaf?"],
             stock: { bread: 1}

create_store :folk_herb_store, "Lawson Darkwade's Folk Herb Store", image: "red_moonlight_street.png", exits: [:red_moonlight_street], keeper: "Lawson Darkwade", dialogue: ["Hey, I'll hook you up with the good stuff. Guaranteed effectiveness."], stock: { potion: 10}

create_npc "Ademisaul",   :evil_dragon_bar, ["There's blood everywhere in the dream and corpses scattered everywhere. Haha! I was among the corpses! I don't wanna die!"]

create_enemy "Sequence 9 - Criminal", :iron_cross_street, hp: 30, atk: 5, gold: 10

create_quest :deliver_quest, "The Half-Mad Monster", giver: "Ademisaul",
             objective: { type: :deliver, item: :monster_formula },
             reward: { gold: 15 }

set_start :iron_cross_street, { potion: 2, gold: 20 }
start_game
