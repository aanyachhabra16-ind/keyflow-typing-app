/**
 * Keyflow - Curated Typing Passages Library
 * Rich, thought-provoking excerpts on flow state, deep work, design, philosophy, and human creativity.
 */

const PASSAGES = [
  {
    id: 1,
    category: "flow",
    title: "The Flow State",
    text: "The best moments in our lives are not the passive, receptive, relaxing times. The best moments usually occur when a person's body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile. Optimal experience is thus something that we make happen."
  },
  {
    id: 2,
    category: "flow",
    title: "Deep Focus",
    text: "Deep work is the ability to focus without distraction on a cognitively demanding task. It is a superpower in our increasingly competitive economy. To produce at your peak level you need to work for extended periods with full concentration on a single task free from all distraction."
  },
  {
    id: 3,
    category: "wisdom",
    title: "The Art of Mastery",
    text: "Mastery is not a function of genius or talent. It is the result of intense focus applied to a particular field over long periods. When you dedicate yourself completely to an art, the boundaries between the tool and the craftsperson begin to dissolve into pure intuition."
  },
  {
    id: 4,
    category: "design",
    title: "Simplicity in Design",
    text: "Simplicity is not the absence of clutter, that is a consequence of simplicity. Simplicity is somehow essentially describing the purpose and place of an object and product. The elegance of good design lies in making the complex feel quiet, purposeful, and inevitable."
  },
  {
    id: 5,
    category: "philosophy",
    title: "The Quiet Mind",
    text: "You have power over your mind, not outside events. Realize this, and you will find strength. The happiness of your life depends upon the quality of your thoughts. Waste no more time arguing about what a good person should be. Be one."
  },
  {
    id: 6,
    category: "tech",
    title: "Crafting Code",
    text: "Programs must be written for people to read, and only incidentally for machines to execute. Beautiful code is like clear prose: concise, unambiguous, and structured with graceful rhythm. Every variable name is an act of communication with future minds."
  },
  {
    id: 7,
    category: "flow",
    title: "Immersion and Rhythm",
    text: "When keystrokes synchronize with thought, typing ceases to be mechanical input and becomes direct telepathy. Words manifest on the screen at the speed of reflection. In this state of flow, time stretches, doubts quiet down, and pure velocity takes over."
  },
  {
    id: 8,
    category: "wisdom",
    title: "The Pace of Progress",
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit. Small disciplines repeated with consistency every day lead to great achievements gained slowly over time. The mountain yields to the persistent step."
  },
  {
    id: 9,
    category: "nature",
    title: "Waves of Thought",
    text: "Like the surface of a deep mountain lake, the mind becomes clearest when undisturbed by sudden turbulence. Ripples settle naturally when left alone. Clarity is not something you force; it is the natural state that emerges when you cease striving."
  },
  {
    id: 10,
    category: "design",
    title: "Invisible Architecture",
    text: "Great typography is like glass: nearly invisible, yet shaping everything seen through it. It guides the eye without demanding attention, providing rhythm and cadence to the silent voice within our consciousness as we read."
  },
  {
    id: 11,
    category: "tech",
    title: "Digital Horizons",
    text: "The computer is the most remarkable tool that we have ever come up with. It is the equivalent of a bicycle for our minds. With every deliberate stroke, we translate human intention into kinetic digital reality."
  },
  {
    id: 12,
    category: "philosophy",
    title: "The Present Moment",
    text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present. Focus your attention entirely on the immediate sentence unfolding before you."
  },
  {
    id: 13,
    category: "wisdom",
    title: "The Kinetic Scribe",
    text: "Speed without control is merely noise. True swiftness is born from calmness, accuracy, and unwavering rhythm. Press each key with quiet intention, and speed will follow naturally as an effortless byproduct of grace."
  },
  {
    id: 14,
    category: "flow",
    title: "The Zone",
    text: "In the zone, self-consciousness vanishes. The challenge of the task perfectly matches the skill of the doer. There is no past to regret, no future to fear, only the vibrant and luminous immediacy of the unfolding now."
  },
  {
    id: 15,
    category: "science",
    title: "The Neural Symphony",
    text: "Touch typing engages complex motor memory circuits. Signals flash between the visual cortex and motor pathways in fractions of a second. Ten fingers dance across rows of keys like seasoned musicians executing a familiar concerto."
  },
  {
    id: 16,
    category: "short",
    title: "Brevity and Swiftness",
    text: "Quick fingers glide over smooth surfaces. Every letter falls into place with crisp precision, leaving a clean trail of rhythm and clarity in its wake."
  },
  {
    id: 17,
    category: "short",
    title: "The Golden Hour",
    text: "Dawn casts a soft amber glow across the desk. A warm cup of tea sits beside the keyboard, waiting patiently as the first thoughts of the morning take flight."
  },
  {
    id: 18,
    category: "wisdom",
    title: "The Arrow and the Bow",
    text: "An archer does not hit the mark by anxious straining, but by breathing, aligning posture, and releasing without tension. Type as the archer shoots: relaxed shoulders, steady eyes, and an effortless release."
  }
];

/**
 * Returns a random passage, optionally filtered by category.
 * Ensures the newly selected passage is different from the current one if possible.
 */
function getRandomPassage(currentId = null, category = "all") {
  let pool = PASSAGES;
  if (category && category !== "all") {
    const filtered = PASSAGES.filter(p => p.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  
  if (pool.length > 1 && currentId !== null) {
    const withoutCurrent = pool.filter(p => p.id !== currentId);
    if (withoutCurrent.length > 0) pool = withoutCurrent;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// Export for browser
window.KeyflowPassages = {
  PASSAGES,
  getRandomPassage
};
