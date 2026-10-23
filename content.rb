# content.rb : placeholder content. Replace the names, dialogue and images with the real thing.
# Location images are PNGs in images/ (a missing file shows a labelled placeholder panel).
# Everything is built with the create_* functions from engine.rb.

create_item :potion, "Healing Potion", "Restores 20 HP.", heal: 20
create_item :token,  "Placeholder Token", "A quest item."

create_location :street, "Tingen Street", image: "images/street.png", exits: [:alley, :shop]
create_location :alley,  "Dark Alley",     image: "images/alley.png",  exits: [:street]

create_store :shop, "Placeholder Shop", image: "images/shop.png", exits: [:street],
             keeper: "Shopkeeper", dialogue: ["Placeholder shop dialogue. Take a look around."],
             stock: { potion: 10, token: 5 }

create_npc "Quest Giver",   :street, ["Placeholder dialogue from the Quest Giver."]
create_npc "Old Collector", :alley,  ["Placeholder dialogue from the Old Collector."]

create_enemy "Placeholder Beyonder", :alley, hp: 30, atk: 5, gold: 10

create_quest :defeat_quest, "Placeholder Quest A", giver: "Quest Giver",
             objective: { type: :defeat, enemy: "Placeholder Beyonder" },
             reward: { gold: 25, items: [:potion] }

create_quest :deliver_quest, "Placeholder Quest B", giver: "Old Collector",
             objective: { type: :deliver, item: :token },
             reward: { gold: 15 }

set_start :street, { potion: 2 }
start_game
