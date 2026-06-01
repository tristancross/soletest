const SOLE_MATRIX_DEFINITIONS = {
  attraction_aesthetics: {
    id: "attraction_aesthetics",
    side: "Attraction",
    title: "Aesthetics",
    description: "Visual, sensory and symbolic attraction signals.",
    axes: [
      {
        key: "attraction_aesthetics_specificity",
        label: "Specificity",
        description:
          "Measures the narrowness or breadth of someone’s attraction template.",
        lowDescription:
          "A more open-ended, elastic and constantly evolving attraction pattern. Attraction may form through context, chemistry or accumulation rather than a fixed type.",
        highDescription:
          "A more fixed type and strictly defined attraction pattern. Attraction may arrive faster when someone matches a recognisable internal template."
      },
      {
        key: "attraction_aesthetics_physicality",
        label: "Physicality",
        description:
          "Measures how much body type, build, posture, movement and physical form shape attraction.",
        lowDescription:
          "Physical attraction is more permissive and less tied to conventional body ideals. Physical appeal may emerge through ease, movement or familiarity rather than immediate form.",
        highDescription:
          "The physical outline of a person registers quickly. Height, build, fitness, movement, posture or bodily confidence may be a strong part of initial attraction."
      },
      {
        key: "attraction_aesthetics_facial_structure",
        label: "Facial Structure",
        description:
          "Measures the kind of facial language someone is drawn to.",
        lowDescription:
          "A pull toward faces that feel softer, warmer or more emotionally readable. Approachability, openness or gentleness may carry more charge than sharpness or distance.",
        highDescription:
          "Attraction to more defined, striking or harder-to-read facial qualities. Angularity, severity, remoteness or unusual structure may feel more compelling."
      },
      {
        key: "attraction_aesthetics_presentation",
        label: "Presentation",
        description:
          "Measures attraction to deliberate visual construction: clothes, grooming, styling, taste and aesthetic control.",
        lowDescription:
          "Attraction is more receptive to looseness, accident or unstudied appearance. Visual intention may work best when it feels lightly worn rather than overly controlled.",
        highDescription:
          "Visual intention matters. How someone styles themselves, edits their appearance or signals taste may become part of the attraction."
      },
      {
        key: "attraction_aesthetics_sensory",
        label: "Sensory",
        description:
          "Measures how much attraction is shaped by close-range sensory cues.",
        lowDescription:
          "Sensory attraction may be quieter, slower or more context-dependent. Physical nearness may become meaningful gradually rather than arriving as an immediate charge.",
        highDescription:
          "Attraction is highly embodied. A voice, scent, way of moving, physical proximity or small tactile detail may become disproportionately memorable."
      },
      {
        key: "attraction_aesthetics_status",
        label: "Status",
        description:
          "Measures attraction to social gravity.",
        lowDescription:
          "Status is more compelling when it is quiet, private or lightly worn. Visible prestige may matter less than unperformed confidence or a magnetism that does not announce itself.",
        highDescription:
          "Social charge matters. Confidence, desirability, reputation, prestige or cultural capital may make someone feel more compelling."
      },
      {
        key: "attraction_aesthetics_familiarity",
        label: "Familiarity",
        description:
          "Measures attraction recurrence: recognisable templates, nostalgic pull and the feeling of having seen or known this type before.",
        lowDescription:
          "Attraction is less tied to recurring templates. Unfamiliar types, unusual energies or people outside an established pattern may be easier to desire.",
        highDescription:
          "Familiarity has pull. Recurring types, nostalgic cues or people who feel emotionally recognisable may become attractive more quickly."
      },
      {
        key: "attraction_aesthetics_fluidity",
        label: "Fluidity",
        description:
          "Measures attraction to ambiguity, androgyny, mixed presentation and beauty that resists easy categorisation.",
        lowDescription:
          "Attraction is more anchored in legible visual signals, defined presentation or familiar style codes. Clarity or recognisable visual language may feel more compelling than ambiguity.",
        highDescription:
          "Ambiguity itself carries charge. Mixed signals, androgyny, contrast or hard-to-place beauty may feel especially magnetic."
      }
    ]
  },

  attraction_chemistry: {
    id: "attraction_chemistry",
    side: "Attraction",
    title: "Chemistry",
    description: "Interaction dynamics that create spark, tension and charge.",
    axes: [
      {
        key: "attraction_chemistry_pursuit",
        label: "Pursuit",
        description:
          "Measures how much tension, chase and romantic escalation intensify attraction.",
        lowDescription:
          "Attraction feels more comfortable when interest is mutual, direct, clear or unforced. Desire may build through ease rather than pursuit.",
        highDescription:
          "Anticipation and romantic forward motion heighten desire. The feeling of being drawn toward someone, or not quite having them, may make attraction more vivid."
      },
      {
        key: "attraction_chemistry_energy",
        label: "Energy",
        description:
          "Measures the need for mirrored momentum, enthusiasm and spontaneous interaction.",
        lowDescription:
          "Chemistry can thrive at a calmer tempo. Quiet presence, steadiness or unhurried connection may feel more attractive than constant animation.",
        highDescription:
          "Attraction is energised by pace and interpersonal electricity. Liveliness, responsiveness and momentum may pull someone into focus faster."
      },
      {
        key: "attraction_chemistry_playfulness",
        label: "Playfulness",
        description:
          "Measures levity, humour and lightness as routes into chemistry.",
        lowDescription:
          "Attraction may not need comic rhythm or verbal sparring to feel alive. Sincerity, steadiness or emotional directness may carry the charge instead.",
        highDescription:
          "Play is central to chemistry. Teasing, humour, mischief or shared absurdity may make someone feel much more attractive."
      },
      {
        key: "attraction_chemistry_intensity",
        label: "Intensity",
        description:
          "Measures desire for heightened emotional or sexual charge.",
        lowDescription:
          "Attraction may feel strongest when it has room to remain steady, grounded or contained. Emotional calm does not reduce the reality of the desire.",
        highDescription:
          "Attraction is amplified by voltage. Tension, urgency, depth or emotional stakes may make a connection feel more alive."
      },
      {
        key: "attraction_chemistry_attunement",
        label: "Attunement",
        description:
          "Measures sensitivity to emotional and social cues inside an interaction.",
        lowDescription:
          "Attraction may depend less on constant micro-reading. Space, clarity or a less fused rhythm may make chemistry feel easier and more natural.",
        highDescription:
          "Subtle responsiveness is a strong source of chemistry. Timing, emotional perception and the sense of being precisely read may deepen attraction quickly."
      },
      {
        key: "attraction_chemistry_presence",
        label: "Presence",
        description:
          "Measures attraction to charisma, magnetism and interpersonal gravity.",
        lowDescription:
          "Attraction may emerge through quieter forms of presence. Subtlety, privacy or qualities that reveal themselves slowly may feel more compelling than obvious charisma.",
        highDescription:
          "Presence matters strongly. Someone’s ability to occupy a room, hold attention or feel vividly there may be highly attractive."
      },
      {
        key: "attraction_chemistry_atmosphere",
        label: "Atmosphere",
        description:
          "Measures how much chemistry depends on mood, environment and setting.",
        lowDescription:
          "Chemistry is more portable. Attraction may hold across ordinary contexts, without needing a charged scene or particular atmosphere to sustain it.",
        highDescription:
          "Atmosphere strongly shapes chemistry. Lighting, music, timing, mood or the feeling of a shared scene may intensify attraction."
      },
      {
        key: "attraction_chemistry_vulnerability",
        label: "Vulnerability",
        description:
          "Measures chemistry through emotional openness, honesty and revealed softness.",
        lowDescription:
          "Attraction may prefer privacy, composure or slower revelation. Emotional guardedness can carry its own kind of dignity or intrigue.",
        highDescription:
          "Vulnerability deepens attraction. Sincerity, uncertainty, guarded tenderness or emotional openness may make someone feel more compelling."
      }
    ]
  },

  attraction_romance: {
    id: "attraction_romance",
    side: "Attraction",
    title: "Romance",
    description: "The emotional mythology and narrative shape of love.",
    axes: [
      {
        key: "attraction_romance_destiny",
        label: "Destiny",
        description:
          "Measures belief in “The One,” fated connection and romantic inevitability.",
        lowDescription:
          "Romance does not need to feel fated to matter. Practical compatibility, lived experience and ordinary closeness may feel more meaningful than signs or coincidence.",
        highDescription:
          "Destiny is part of the romantic charge. Timing, symbolism, coincidence or the feeling that something was meant to happen may intensify attraction."
      },
      {
        key: "attraction_romance_devotion",
        label: "Devotion",
        description:
          "Measures the desire to be emotionally prioritised, chosen and made central in someone’s romantic world.",
        lowDescription:
          "Romance may feel better with more air around it. Intense affection can feel overwhelming if it starts to crowd autonomy; connection does not need to consume the whole self.",
        highDescription:
          "Devotion is deeply attractive. Being prioritised, chosen and emotionally centred may be central to romantic pull."
      },
      {
        key: "attraction_romance_drama",
        label: "Drama",
        description:
          "Measures attraction to emotionally heightened romance.",
        lowDescription:
          "Romance may feel strongest when it is steady, clear and low-friction. Emotional safety may be more compelling than suspense.",
        highDescription:
          "Drama can intensify attraction. Conflict, uncertainty, reversals or high emotional stakes may make a connection feel more vivid."
      },
      {
        key: "attraction_romance_fantasy",
        label: "Fantasy",
        description:
          "Measures projection, imagination and cinematic romantic thinking.",
        lowDescription:
          "Romance is more grounded in pragmatism. Seeing someone clearly may feel more attractive than being carried away by what they represent.",
        highDescription:
          "Fantasy is part of desire. What someone evokes, symbolises or allows you to imagine may matter as much as what is plainly known."
      },
      {
        key: "attraction_romance_longing",
        label: "Longing",
        description:
          "Measures attraction to yearning, anticipation and incompleteness.",
        lowDescription:
          "Desire grows more through presence than absence. Availability, reciprocity and directness may feel more romantic than waiting or wanting from a distance.",
        highDescription:
          "Longing can heighten romance. Distance, anticipation, not-quite-having or emotional incompleteness may make attraction more intense."
      },
      {
        key: "attraction_romance_idealism",
        label: "Idealism",
        description:
          "Measures resistance to pragmatic compromise in love.",
        lowDescription:
          "Romance is allowed to be practical, embodied and sustainable. What works in real life may feel more meaningful than protecting an ideal.",
        highDescription:
          "Love should not be reduced to ordinary calculation. Romance may feel most compelling when it exceeds practicality, compromise or convenience."
      },
      {
        key: "attraction_romance_expression",
        label: "Expression",
        description:
          "Measures desire for gestures, dates, rituals and visible romance.",
        lowDescription:
          "Romance may be most convincing when it is understated. Quiet care, private understanding or practical acts may matter more than overt display.",
        highDescription:
          "Visible expression matters. Gestures, rituals, words, dates or romantic signalling may strongly shape attraction."
      },
      {
        key: "attraction_romance_novelty",
        label: "Novelty",
        description:
          "Measures desire for freshness, surprise and reinvention within romance.",
        lowDescription:
          "Romance is more grounded in continuity. Familiar rhythms, emotional recognisability and the deepening of what is already known may feel most compelling.",
        highDescription:
          "Attraction is intensified by freshness and discovery. Surprise, reinvention, newness or the not-yet-understood may feel especially magnetic."
      }
    ]
  },

  connection_values: {
    id: "connection_values",
    side: "Connection",
    title: "Values",
    description: "Long-term life orientation, priorities and compatibility foundations.",
    axes: [
      {
        key: "connection_values_structure",
        label: "Structure",
        description:
          "Measures preference for order, planning and clear expectations in life and relationships.",
        lowDescription:
          "Comfort with flexibility, improvisation and leaving room for things to emerge. Too much structure may feel constraining rather than reassuring.",
        highDescription:
          "Structure is stabilising. Plans, routines, clarity and organised decision-making may be important compatibility signals."
      },
      {
        key: "connection_values_communication",
        label: "Communication",
        description:
          "Measures the role of directness, emotional articulation and conversational clarity.",
        lowDescription:
          "Connection may work through implication, ease and shared understanding. Not everything has to be processed out loud to feel secure or meaningful.",
        highDescription:
          "Communication is central. Talking things through, naming feelings and making intentions explicit may be important to compatibility."
      },
      {
        key: "connection_values_conviction",
        label: "Conviction",
        description:
          "Measures firmness of belief, decisiveness and willingness to stand by principles.",
        lowDescription:
          "A more exploratory relationship to certainty. Openness, nuance and the ability to revise a position may matter more than fixed conviction.",
        highDescription:
          "Strong principles and decisive orientation. Clear beliefs, commitment and standing by a position may be important to compatibility."
      },
      {
        key: "connection_values_outlook",
        label: "Outlook",
        description:
          "Measures general orientation toward difficulty, possibility and the future.",
        lowDescription:
          "A more cautious, unsentimental or realism-first outlook. Clear-eyed appraisal may feel more trustworthy than optimism for its own sake.",
        highDescription:
          "A more hopeful or forward-facing orientation. Possibility, resilience and constructive momentum may matter strongly in connection."
      },
      {
        key: "connection_values_ambition",
        label: "Ambition",
        description:
          "Measures drive, aspiration and the desire to build toward future goals.",
        lowDescription:
          "Compatibility may be less tied to achievement or upward momentum. Contentment, presence, stability or life outside conventional striving may feel more important.",
        highDescription:
          "Ambition is important. Growth, momentum, achievement or shared future-building may be strong compatibility signals."
      },
      {
        key: "connection_values_family",
        label: "Family",
        description:
          "Measures the importance of family bonds, domestic continuity and inherited forms of belonging.",
        lowDescription:
          "Intimacy may be less defined by inherited family structures. Chosen bonds, independence or self-made forms of belonging may matter more.",
        highDescription:
          "Family, kinship or domestic continuity matter strongly. Belonging, tradition or close family integration may shape compatibility."
      },
      {
        key: "connection_values_curiosity",
        label: "Curiosity",
        description:
          "Measures openness to learning, exploration and intellectual or experiential novelty.",
        lowDescription:
          "Comfort with depth, familiarity and returning to what already matters. Exploration may be less important than rootedness or sustained attention.",
        highDescription:
          "Curiosity is energising. Questions, discovery, learning and shared expansion may be important to connection."
      },
      {
        key: "connection_values_intuition",
        label: "Intuition",
        description:
          "Measures reliance on instinct, pattern-sense and felt interpretation rather than purely factual reasoning.",
        lowDescription:
          "A more evidence-led or analytical orientation. Clear reasons, observable facts and grounded decision-making may feel more trustworthy.",
        highDescription:
          "Instinct and emotional pattern-recognition matter strongly. Impressions, atmosphere and felt meaning may guide how people are understood."
      }
    ]
  },

  connection_attachment: {
    id: "connection_attachment",
    side: "Connection",
    title: "Attachment",
    description: "Emotional security, closeness and relational self-regulation.",
    axes: [
      {
        key: "connection_attachment_autonomy",
        label: "Independence",
        description:
          "Measures the need for separateness, personal space and self-directed identity inside a relationship.",
        lowDescription:
          "Closeness and shared routine may feel natural rather than intrusive. A more merged or mutually involved relationship style may feel comfortable.",
        highDescription:
          "Independence is important. Distinct routines, interests and emotional territory may help a relationship feel healthy."
      },
      {
        key: "connection_attachment_organisation",
        label: "Organisation",
        description:
          "Measures the desire for clarity, rhythm and emotional logistics in closeness.",
        lowDescription:
          "Comfort with looser relational rhythms. Connection may feel more alive when it can adapt naturally rather than being defined in advance.",
        highDescription:
          "Organised closeness feels reassuring. Clear expectations, rhythms and responsibilities may help intimacy feel stable."
      },
      {
        key: "connection_attachment_sensitivity",
        label: "Sensitivity",
        description:
          "Measures how strongly subtle changes in tone, distance or emotional availability register.",
        lowDescription:
          "A steadier, less reactive attachment style. Emotional changes may need to become clearer before they feel significant.",
        highDescription:
          "Strong attunement to relational shifts. Small changes in tone, distance or availability may register quickly and vividly."
      },
      {
        key: "connection_attachment_intensity",
        label: "Intensity",
        description:
          "Measures the emotional volume of attachment experiences.",
        lowDescription:
          "Closeness and uncertainty may be felt in a more even, contained way. Emotional steadiness may feel more natural than heightened relational feeling.",
        highDescription:
          "Attachment experiences are felt vividly. Closeness, uncertainty, reassurance and distance may carry a stronger emotional charge."
      },
      {
        key: "connection_attachment_predictability",
        label: "Predictability",
        description:
          "Measures preference for consistency, reliability and stable emotional patterns.",
        lowDescription:
          "Comfort with spontaneity or variation in relational rhythms. Trust may not require repeated signals of sameness.",
        highDescription:
          "Predictability is reassuring. Consistency, reliability and repeated emotional signals may help trust build."
      },
      {
        key: "connection_attachment_proximity",
        label: "Proximity",
        description:
          "Measures desire for closeness, shared time and involvement in each other’s everyday life.",
        lowDescription:
          "Intimacy can coexist with space and separateness. Connection may not require constant contact or deep involvement in daily routines.",
        highDescription:
          "Closeness is strengthened by frequent contact, shared time and everyday emotional availability."
      },
      {
        key: "connection_attachment_assurance",
        label: "Assurance",
        description:
          "Measures the importance of reassurance, affirmation and feeling securely chosen.",
        lowDescription:
          "Security may come more from consistency, independence or internal steadiness than frequent affirmation. Trust may not need to be constantly restated.",
        highDescription:
          "Explicit reassurance matters. Affirmation, care and clear signs of commitment may help the relationship feel secure."
      },
      {
        key: "connection_attachment_confidence",
        label: "Confidence",
        description:
          "Measures baseline security and self-trust within romantic connection.",
        lowDescription:
          "Connection may involve more caution, self-protection or sensitivity to rejection. This can also reflect care around where trust is placed.",
        highDescription:
          "Greater ease with uncertainty and emotional footing. Connection may feel secure without constant confirmation."
      }
    ]
  },

  connection_interpersonal: {
    id: "connection_interpersonal",
    side: "Connection",
    title: "Interpersonal",
    description: "Social conduct, relational style and everyday coexistence.",
    axes: [
      {
        key: "connection_interpersonal_collaboration",
        label: "Collaboration",
        description:
          "Measures preference for shared problem-solving, mutual adjustment and working as a unit.",
        lowDescription:
          "A more independent or individually directed style. Clear personal responsibility may feel cleaner than constant joint negotiation.",
        highDescription:
          "Connection is strongest when both people operate as active partners, adjusting and solving problems together."
      },
      {
        key: "connection_interpersonal_harmony",
        label: "Harmony",
        description:
          "Measures desire for emotional smoothness, low friction and peaceful coexistence.",
        lowDescription:
          "More tolerance for friction, directness or productive disagreement. Conflict may not automatically feel like a threat to connection.",
        highDescription:
          "Harmony matters strongly. Emotional smoothness, repair and low-friction coexistence may feel central to relational comfort."
      },
      {
        key: "connection_interpersonal_temperament",
        label: "Temperament",
        description:
          "Measures steadiness of mood, conflict style and emotional regulation around others.",
        lowDescription:
          "A more expressive, changeable or emotionally immediate style. Feelings may move closer to the surface and become easier to read.",
        highDescription:
          "A steadier interpersonal rhythm. Calmness, patience and regulation under pressure may shape how connection works."
      },
      {
        key: "connection_interpersonal_generosity",
        label: "Tolerance",
        description:
          "Measures willingness to make accommodations that impact everyday life.",
        lowDescription:
          "Clearer boundaries around giving and accommodation. Care may be strongest when it does not become overextension or self-erasure.",
        highDescription:
          "Care is often expressed through patience, flexibility and practical consideration. Giving and goodwill may be central to relational style."
      },
      {
        key: "connection_interpersonal_loyalty",
        label: "Loyalty",
        description:
          "Measures commitment to continuity, allegiance and standing by people once trust is established.",
        lowDescription:
          "Loyalty may be more conditional on continued health, truth or mutuality. Bonds can be revised when they stop working.",
        highDescription:
          "Strong investment in continuity and standing by people. Reliability and relational permanence may matter deeply."
      },
      {
        key: "connection_interpersonal_trust",
        label: "Trust",
        description:
          "Measures ease with believing others’ intentions and allowing emotional reliance.",
        lowDescription:
          "Trust may be earned gradually and carefully. Evidence, consistency and time may matter before emotional reliance feels safe.",
        highDescription:
          "A greater readiness to assume goodwill and allow reliance. Trust may form more naturally when the connection feels right."
      },
      {
        key: "connection_interpersonal_influence",
        label: "Influence",
        description:
          "Measures comfort with leading, persuading or shaping the direction of a relationship.",
        lowDescription:
          "A more adaptive or receptive interpersonal style. Listening, responding or letting the dynamic emerge may feel more natural than steering it.",
        highDescription:
          "Comfort with initiating, leading or shaping what happens next. A more directive role may come naturally in connection."
      },
      {
        key: "connection_interpersonal_sociability",
        label: "Sociability",
        description:
          "Measures how much connection is energised by social contact, conversation and shared external worlds.",
        lowDescription:
          "Connection may be more inward, private or selectively social. Fewer people, quieter settings or intimacy away from constant activity may feel more nourishing.",
        highDescription:
          "Social contact and shared external worlds energise connection. Conversation, group settings or outward-facing activity may matter more."
      }
    ]
  }
};

const SOLE_MATRIX_NEUTRAL_DESCRIPTIONS = {
  // Attraction — Aesthetics
  attraction_aesthetics_specificity:
    "A flexible but recognisable attraction pattern. There may be some recurring preferences, but context, mood and chemistry can still shift what feels compelling.",

  attraction_aesthetics_physicality:
    "Physical form matters, but not as a single deciding signal. Body, movement and presence may become more or less important depending on the person and the connection.",

  attraction_aesthetics_facial_structure:
    "A balance between approachable and striking facial qualities. Warmth, readability, definition and distinctiveness may all matter, depending on the face and the surrounding chemistry.",

  attraction_aesthetics_presentation:
    "Presentation registers, but does not need to dominate. Style, grooming or visual intention may add to attraction when they feel integrated rather than overly constructed.",

  attraction_aesthetics_sensory:
    "Sensory cues are part of the picture, but usually work alongside context and emotional familiarity. Voice, movement or closeness may become more meaningful once attraction has begun to form.",

  attraction_aesthetics_status:
    "Social charge has some influence, but it is not the whole engine. Confidence, cultural fluency or desirability may matter most when they feel natural rather than performed.",

  attraction_aesthetics_familiarity:
    "Some recurring templates may exist, but they are not completely fixed. Familiarity can be comforting, while unfamiliar qualities can still become attractive in the right context.",

  attraction_aesthetics_fluidity:
    "Attraction can move between clarity and ambiguity. Legible presentation may appeal, but so can contrast, softness, mixed signals or qualities that are harder to categorise.",

  // Attraction — Chemistry
  attraction_chemistry_pursuit:
    "Desire can build through both ease and anticipation. A connection may feel best when there is momentum, but not so much uncertainty that it becomes destabilizing.",

  attraction_chemistry_energy:
    "Chemistry may work across different tempos. Liveliness can be attractive, but so can steadiness, calm attention and a slower shared rhythm.",

  attraction_chemistry_playfulness:
    "Playfulness matters when it feels natural, but it does not need to carry the whole connection. Humour, sincerity and emotional directness may all contribute to chemistry.",

  attraction_chemistry_intensity:
    "A moderate amount of charge may be most compelling. Attraction can feel alive without needing to become overwhelming, volatile or constantly heightened.",

  attraction_chemistry_attunement:
    "Subtle responsiveness matters, but so does space. Chemistry may come from feeling understood without needing every emotional shift to be read immediately.",

  attraction_chemistry_presence:
    "Presence is noticeable, but not only in obvious or charismatic forms. Attraction may come from a mix of vividness, quiet confidence and qualities that reveal themselves over time.",

  attraction_chemistry_atmosphere:
    "Mood and setting can intensify chemistry, but attraction does not depend entirely on the scene. The surrounding atmosphere may enhance something already beginning to form.",

  attraction_chemistry_vulnerability:
    "Openness can deepen attraction when it feels earned. Chemistry may build through a balance of honesty, composure and gradual emotional revelation.",

  // Attraction — Romance
  attraction_romance_destiny:
    "Romance may feel meaningful without needing to feel completely fated. Coincidence, timing and symbolism can matter, but practical compatibility still carries weight.",

  attraction_romance_devotion:
    "Being chosen matters, but with room to breathe. Romantic closeness may feel best when care and priority are balanced with autonomy and space.",

  attraction_romance_drama:
    "Some emotional stakes can make romance feel vivid, but too much volatility may reduce the appeal. Clarity and suspense may both have their place.",

  attraction_romance_fantasy:
    "Imagination plays a role, but it does not fully replace reality. Attraction may involve both what someone is and what they seem to represent.",

  attraction_romance_longing:
    "Anticipation can heighten romance, but presence matters too. Desire may build through a mix of wanting, waiting, reciprocity and actual closeness.",

  attraction_romance_idealism:
    "Love may need both meaning and practicality. Romance can feel elevated without entirely rejecting compromise, sustainability or ordinary life.",

  attraction_romance_expression:
    "Visible romance can matter when it feels sincere. Gestures, words and rituals may be meaningful, but understated care can carry equal weight.",

  attraction_romance_novelty:
    "Freshness and continuity may both appeal. Romance can be strengthened by surprise and reinvention, but also by recognisable rhythms and deepening familiarity.",

  // Connection — Values
  connection_values_structure:
    "A balance between planning and flexibility. Clear expectations may help, but there is still room for adaptation, improvisation and letting things develop naturally.",

  connection_values_communication:
    "Communication matters, but it does not always need to be exhaustive. Some things may be spoken directly, while others can be understood through rhythm, action or implication.",

  connection_values_conviction:
    "Beliefs may be held with seriousness but not rigidity. There is room for principle, nuance and changing position when new information appears.",

  connection_values_outlook:
    "A mixed outlook that can hold both realism and possibility. Difficulty may be seen clearly without ruling out resilience, optimism or forward movement.",

  connection_values_ambition:
    "Future-building matters, but not at the expense of the present. Growth, contentment, stability and aspiration may all need some space in compatibility.",

  connection_values_family:
    "Family and chosen bonds may both matter. Inherited ties can be meaningful, while independence and self-made forms of belonging still remain important.",

  connection_values_curiosity:
    "Curiosity is present but not restless. There may be interest in discovery and learning, alongside a need for depth, familiarity and returning to what already matters.",

  connection_values_intuition:
    "Both instinct and evidence may guide interpretation. Impressions, atmosphere and felt meaning can matter, but so can clarity, facts and grounded reasoning.",

  // Connection — Attachment
  connection_attachment_autonomy:
    "Closeness and independence both matter. A relationship may feel healthiest when shared life and separate identity are kept in active balance.",

  connection_attachment_organisation:
    "Some clarity is reassuring, but too much definition may feel unnecessary. Connection can benefit from rhythm while still being allowed to adapt naturally.",

  connection_attachment_sensitivity:
    "Emotional shifts register, but may not immediately dominate. Subtle changes can matter, while clearer signals may still be needed before drawing conclusions.",

  connection_attachment_intensity:
    "Attachment may be felt with real emotion, but not constant urgency. Closeness, uncertainty and reassurance can carry weight without overwhelming the whole connection.",

  connection_attachment_predictability:
    "Consistency is helpful, but not everything has to be repeated or fixed. Trust may build through reliability while still leaving room for spontaneity.",

  connection_attachment_proximity:
    "Shared time and separateness both have value. Connection may feel strongest when closeness is available without becoming constant or compulsory.",

  connection_attachment_assurance:
    "Reassurance matters sometimes, but does not need to be constant. Security may come from a mix of affirmation, consistency and internal steadiness.",

  connection_attachment_confidence:
    "A moderate level of security in connection. Uncertainty may still register, but it does not necessarily destabilise the whole emotional footing.",

  // Connection — Interpersonal
  connection_interpersonal_collaboration:
    "A balance between shared problem-solving and individual responsibility. Some things may work best jointly, while others feel cleaner when handled independently.",

  connection_interpersonal_harmony:
    "Harmony matters, but friction is not automatically alarming. Connection may allow disagreement while still valuing repair, smoothness and emotional care.",

  connection_interpersonal_temperament:
    "Emotion is expressive but not entirely uncontained. Feelings may be readable while still leaving room for steadiness, patience and regulation.",

  connection_interpersonal_generosity:
    "Care is present, but boundaries remain important. Giving, flexibility and goodwill may matter most when they do not become overextension.",

  connection_interpersonal_loyalty:
    "Continuity matters, but not at any cost. Bonds may be taken seriously while still being open to revision if they stop feeling mutual or healthy.",

  connection_interpersonal_trust:
    "Trust may build at a measured pace. There can be openness to goodwill, while still needing consistency and time before deeper reliance feels safe.",

  connection_interpersonal_influence:
    "Influence may be situational. There may be comfort with leading when needed, but also with listening, adapting and letting the dynamic emerge.",

  connection_interpersonal_sociability:
    "Connection may move between private intimacy and shared social worlds. Social contact can be energising, but quieter or more selective forms of closeness also matter."
};

Object.values(SOLE_MATRIX_DEFINITIONS).forEach(matrix => {
  matrix.axes.forEach(axis => {
    const neutralDescription = SOLE_MATRIX_NEUTRAL_DESCRIPTIONS[axis.key];

    if (neutralDescription) {
      axis.neutralDescription = neutralDescription;
    }
  });
});

function getSoleMatrixDefinition(matrixId) {
  return SOLE_MATRIX_DEFINITIONS[matrixId] || null;
}

function getSoleMatrixDefinitionsBySide(side) {
  return Object.values(SOLE_MATRIX_DEFINITIONS).filter(matrix => matrix.side === side);
}

function getAllSoleAxisKeys() {
  return Object.values(SOLE_MATRIX_DEFINITIONS)
    .flatMap(matrix => matrix.axes.map(axis => axis.key));
}

window.soleMatrixDefinitions = {
  all: SOLE_MATRIX_DEFINITIONS,
  get: getSoleMatrixDefinition,
  bySide: getSoleMatrixDefinitionsBySide,
  axisKeys: getAllSoleAxisKeys
};