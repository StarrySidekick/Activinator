/* Activinator — what the clock is worth, and nothing more than that.
   ------------------------------------------------------------------
   The README deferred time of day with a good reason: "a filter you didn't set
   is a filter you can't understand." At half past eleven the deck cheerfully
   offers you a farmers market, and the fix that suggests itself — quietly
   dropping cards that do not suit the hour — is exactly the thing that reason
   forbids. You would never see it happen, and you could never find the switch.

   So the clock never filters. It *offers*, once, on the face of the deck, and
   what you tap sets the ordinary context you could have set yourself — visible
   in Right now afterwards, changed and cleared like anything else there. The
   difference between a filter you did not set and one you set in one tap is
   the whole of this file.

   One rule, because one rule is honestly defensible and a table of them would
   be a horoscope. Late is late: the shops are shut, the neighbours are asleep,
   and a thing to go and do is a thing to do here, quietly, in the time before
   you give up on the day. Weather would slot in beside it as a second rule
   with the same shape — it wants a network call and a decision about what a
   forecast is allowed to say, so it stays Timothy's to make. */

/* Local hours, inclusive of the first and exclusive of the last. Late runs
   across midnight, which is why it is a test rather than a pair of numbers. */
const isLate = (h) => h >= 22 || h < 6;

/* What the hour suggests, as ordinary `ctx` — the same three axes the Right
   now panel writes, so there is no second vocabulary to keep in step. */
const SUGGESTIONS = [
  {
    id: 'late',
    when: isLate,
    line: 'It’s late — something short, at home?',
    ctx: { where: 'home', time: 'short' }
  }
];

/** What, if anything, this hour has to offer. `now` is injectable so a test
    does not have to run at midnight to check the midnight case. */
const suggestionFor = (now = new Date()) => {
  const h = now.getHours();
  return SUGGESTIONS.find(s => s.when(h)) || null;
};

/** Whether to put it on the deck. Three ways to say no, and each is a case
    where showing it would be presumptuous rather than helpful:
    the hour has nothing to say; you have already told it where and how long,
    so it has no business overriding you; or you dismissed it this session. */
const offerNow = (ctx, dismissed, now = new Date()) => {
  const s = suggestionFor(now);
  if (!s) return null;
  if (dismissed === s.id) return null;
  if (Object.keys(s.ctx).some(k => ctx && ctx[k])) return null;
  return s;
};

export { suggestionFor, offerNow, isLate, SUGGESTIONS };
