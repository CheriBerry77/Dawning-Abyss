# content.rb : placeholder content. Replace the names, dialogue and ASCII art with the real thing.
# Everything is built with the create_* functions from engine.rb.

STREET_ART = <<~'ART'
         .                               *
      ___|___      ___________      _______|_______
     /  ___  \    |  _ _ _ _  |    /  _   _   _   \
    |  |[#]|  |   | |_|_|_|_| |   |  |#| |#| |#|   |
    |__|___|__|   |___________|   |__|_|_|_|_|_|___|
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   . : . : . : . : . : . : . : . : . : . : . : . : .
   : . : . : . : . : . : . : . : . : . : . : . : . :
                    (*)             (*)
                     |               |
ART

ALLEY_ART = <<~'ART'
   ################        ##################
   ################        ##################
   ####  [#]  #####        ####  [#]  #######
   ################  ,,,,  ##################
   ################  ,,,,  ##################
                     ,,,,
        . : . : . :  ,,,,  : . : . : . : . :
          (dark alley, a figure watches you)
ART

SHOP_ART = <<~'ART'
      _______________________________
     /_______  PLACEHOLDER SHOP ______\
     |  ___     ___     ___     ___   |
     | |   |   |   |   |   |   |   |  |
     | |___|   |___|   |___|   |___|  |
     |===============================|
     |      .-.        [counter]      |
     |_____(   )____________________/
ART

create_item :potion, "Healing Potion", "Restores 20 HP.", heal: 20
create_item :token,  "Placeholder Token", "A quest item."

create_location :street, "Tingen Street", art: STREET_ART, exits: [:alley, :shop]
create_location :alley,  "Dark Alley",     art: ALLEY_ART,  exits: [:street]

create_store :shop, "Placeholder Shop", art: SHOP_ART, exits: [:street],
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
