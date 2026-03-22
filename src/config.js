(function() {
  const config = {
    cubeSkins: [
      { id: "alchemist", name: "Alchemist", cost: 0, desc: "Arcane lab-grade plating.", texture: "assets/block/alchemist.png", accent: "#f4d35e", spriteScale: 1.22 },
      { id: "caution", name: "Caution Tape", cost: 140, desc: "Industrial hazard styling.", texture: "assets/block/caution.png", accent: "#ffd166", spriteScale: 1.22 },
      { id: "crystals", name: "Crystal Core", cost: 180, desc: "Faceted gem energy.", texture: "assets/block/crystals.png", accent: "#8fd3ff", spriteScale: 1.22 },
      { id: "gum", name: "Bubble Gum", cost: 130, desc: "Soft candy-coated finish.", texture: "assets/block/gum.png", accent: "#ff8cc6", spriteScale: 1.22 },
      { id: "wooden", name: "Wooden Crate", cost: 160, desc: "Old-school crate texture.", texture: "assets/block/wooden.png", accent: "#d6a36c", spriteScale: 1.22 }
    ],
    stairThemes: [
      { id: "aurora", name: "Aurora Deck", cost: 0, c1: "#1d2740", c2: "#253557", desc: "The clean sci-fi default." },
      { id: "ember", name: "Ember Steel", cost: 90, c1: "#34241c", c2: "#4a3328", desc: "Warm industrial tones." },
      { id: "glacier", name: "Glacier Run", cost: 180, c1: "#1a3340", c2: "#254455", desc: "Cold smooth blues." },
      { id: "acid_lab", name: "Acid Lab", cost: 220, c1: "#172615", c2: "#7dff3c", desc: "Toxic green plating with a corrosive glow." },
      {
        id: "candy",
        name: "Candy Pack",
        cost: 120,
        c1: "#ffbfdc",
        c2: "#ff9fc8",
        desc: "Candy skies, soft clouds, and your custom candy block set.",
        preview: "assets/packs/CANDY/bg/bg.png",
        backgroundImage: "assets/packs/CANDY/bg/bg.png",
        hudFrame: "assets/packs/CANDY/ui/score_ui.png",
        stairTexture: "assets/packs/CANDY/block/gum.png",
        stairTextures: [
          "assets/packs/CANDY/steps/step_1.png",
          "assets/packs/CANDY/steps/step_2.png",
          "assets/packs/CANDY/steps/step_3.png",
          "assets/packs/CANDY/steps/step_4.png"
        ],
        parallaxClouds: [
          { texture: "assets/packs/CANDY/bg/clouds_sprite_1.png", speed: 0.08, y: 0.12, scale: 0.85, alpha: 0.78, gap: 100 },
          { texture: "assets/packs/CANDY/bg/clouds_sprite_2.png", speed: 0.14, y: 0.22, scale: 0.95, alpha: 0.7, gap: 140 },
          { texture: "assets/packs/CANDY/bg/clouds_sprite_3.png", speed: 0.2, y: 0.33, scale: 1.05, alpha: 0.62, gap: 180 },
          { texture: "assets/packs/CANDY/bg/clouds_sprite_4.png", speed: 0.3, y: 0.48, scale: 1.15, alpha: 0.56, gap: 220 }
        ]
      }
    ],
    trailItems: [
      { id: "default", name: "Core Trail", cost: 0, color: "#8b6cff", desc: "Simple energy ribbon." },
      { id: "mint", name: "Mint Trace", cost: 70, color: "#2ee6c9", desc: "Bright fast-moving line." },
      { id: "gold", name: "Gold Arc", cost: 160, color: "#ffd166", desc: "Premium glowing tail." },
      { id: "rainbow", name: "Prism Trace", cost: 0, color: "rainbow", desc: "A shifting spectrum of light." }
    ],
    effectItems: [
      { id: "default", name: "Pulse Burst", cost: 0, color: "#ffffff", desc: "Simple impact burst." },
      { id: "spark", name: "Spark Burst", cost: 90, color: "#7fd7ff", desc: "Cool sharp particles." },
      { id: "nova", name: "Nova Bloom", cost: 210, color: "#ff8cff", desc: "Big flashy impact effect." }
    ],
    upgradeItems: [
      { id: "air_control", name: "Air Control", cost: 120, desc: "Stronger midair nudges." },
      { id: "coin_magnet", name: "Coin Bonus", cost: 160, desc: "Small extra end-of-run coin boost." },
      { id: "impact_master", name: "Impact Mastery", cost: 190, desc: "Longer combo sustain window." }
    ],
    perkPool: [
      { id: "turbo_launch", name: "Turbo Launch", desc: "+18% launch speed for the rest of the run.", badge: "Offense" },
      { id: "combo_buffer", name: "Combo Buffer", desc: "+450ms combo decay window.", badge: "Combo" },
      { id: "coin_surge", name: "Coin Surge", desc: "+1 coin from every coin stair and +4 end-of-run credits.", badge: "Economy" },
      { id: "air_drift", name: "Air Drift+", desc: "Much better in-air control.", badge: "Control" },
      { id: "spring_shell", name: "Spring Shell", desc: "Sticky stairs slow you less and break stairs delay longer.", badge: "Safety" },
      { id: "score_boost", name: "Score Burst", desc: "+20% score from stair hits.", badge: "Score" },
      { id: "bump", name: "Bump", desc: "Gain 2 bump charges. Each one gives a quick 55% launch-strength shove.", badge: "Active" },
      { id: "slam", name: "Slam", desc: "Gain 3 slams. Tap/click while airborne to drive straight down.", badge: "Active" },
      { id: "anti_stick", name: "Anti-Stick", desc: "Sticky stairs no longer slow you down.", badge: "Safety" },
      { id: "feather_fall", name: "Feather Fall", desc: "Softens heavy falls and gives you more recovery time in the air.", badge: "Control" },
      { id: "relaunch", name: "Re-Launch", desc: "Gain 1 re-launch. Freeze in place and fire again from your current spot.", badge: "Active" }
    ],
    modes: {
      endless: {
        name: "Endless",
        desc: "Balanced procedural run with all systems active.",
        stairCount: 500,
        specialRate: 0.24
      },
      precision: {
        name: "Precision",
        desc: "Shorter run, fewer specials, more punishing misses.",
        stairCount: 280,
        specialRate: 0.16
      },
      chaos: {
        name: "Chaos",
        desc: "More crazy stairs, faster scoring, bigger swings.",
        stairCount: 420,
        specialRate: 0.35
      }
    },
    cubeClasses: {
      balanced: {
        name: "Balanced",
        restitution: 0.5,
        frictionAir: 0.004,
        density: 0.05,
        launchPower: 0.33,
        control: 0.36
      },
      heavy: {
        name: "Heavy",
        restitution: 0.34,
        frictionAir: 0.003,
        density: 0.08,
        launchPower: 0.35,
        control: 0.26
      },
      light: {
        name: "Light",
        restitution: 0.68,
        frictionAir: 0.005,
        density: 0.035,
        launchPower: 0.31,
        control: 0.46
      }
    }
  };

  window.STAIR_CONFIG = config;
})();
