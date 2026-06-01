const DASHBOARD_ASSIGNMENTS = [
  {
    id: "core_values_calibration_01",
    type: "assessmentCard",
    title: "Core Values Calibration",
    prompt: "Help the system refine early-stage compatibility filtering.",
    description: "Initial preference signals are used to narrow the candidate pool.",
    status: "active",
    priority: 10,
    ctaLabel: "Save calibration",
    saveMode: "single",
effect: {
  impactWeight: "medium",
  candidateReduction: 400,
  confidenceIncrease: 6,
  stageLabel: "Values alignment integrated into compatibility filtering"
},
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:00:00Z"
    },
    questions: [
      {
        id: "core_values",
        type: "multiSelect",
        prompt: "Select the 3 values that matter most in a connection",
        config: {
          minSelections: 3,
          maxSelections: 3,
          options: [
            { value: "Curiosity", label: "Curiosity" },
            { value: "Honesty", label: "Honesty" },
            { value: "Humour", label: "Humour" },
            { value: "Kindness", label: "Kindness" },
            { value: "Warmth", label: "Warmth" },
            { value: "Adventure", label: "Adventure" },
            { value: "Stability", label: "Stability" },
            { value: "Ambition", label: "Ambition" }
          ]
        }
      }
    ]
  },

  {
    id: "first_date_energy_01",
    type: "assessmentCard",
    title: "First-Date Energy Mapping",
    prompt: "Help the system refine conversational alignment.",
    description: "Tone preferences are used to improve behavioural matching.",
    status: "active",
    priority: 20,
    ctaLabel: "Save preference",
    saveMode: "single",
    effect: {
      candidateReduction: 250,
      confidenceIncrease: 4,
      stageLabel: "Conversational tone preferences integrated into alignment modelling"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:05:00Z"
    },
    questions: [
      {
        id: "first_date_energy",
        type: "slider",
        prompt: "How do you prefer someone to be on a first date?",
        config: {
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 50,
          minLabel: "Playful",
          maxLabel: "Reflective",
          centerLabel: "Balanced"
        }
      }
    ]
  },

  {
    id: "model_assessment_01",
    type: "assessmentCard",
    title: "Model Assessment 01",
    prompt: "Help the system understand how this model is being perceived.",
    description: "These signals contribute to personality alignment and refinement.",
    status: "active",
    priority: 30,
    ctaLabel: "Save assessment",
    saveMode: "single",
    effect: {
      candidateReduction: 250,
      confidenceIncrease: 4,
      stageLabel: "Perception signals integrated into personality alignment"
    },
    meta: {
      category: "feedback",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:10:00Z"
    },
    questions: [
      {
        id: "model_trait",
        type: "singleSelect",
        prompt: "Which description feels closest to the model you are speaking with?",
        config: {
          options: [
            { value: "Curious", label: "Curious" },
            { value: "Thoughtful", label: "Thoughtful" },
            { value: "Playful", label: "Playful" },
            { value: "Reserved", label: "Reserved" }
          ]
        }
      }
    ]
  },

{
  id: "openness_mapping_01",
  type: "assessmentCard",
  title: "Emotional Openness Mapping",
  prompt: "Help the system refine emotional compatibility modelling.",
  description: "A small number of calibration points help improve conversational fit.",
  status: "active",
  priority: 40,
  ctaLabel: "Save response",
  saveMode: "single",
  effect: {
    candidateReduction: 180,
    confidenceIncrease: 3,
    stageLabel: "Emotional openness signals incorporated into compatibility modelling",
    matrixId: "connection_attachment"
  },
  meta: {
    category: "calibration",
    assignedBy: "system",
    assignedAt: "2026-03-13T18:20:00Z"
  },
  questions: [
    {
      id: "openness_scale",
      type: "scale7",
      prompt: "When someone shares something personal, I usually respond in kind.",
      config: {
        minLabel: "Not at all like me",
        midLabel: "Neutral",
        maxLabel: "Very much like me"
      },
      scoring: [
        { key: "connection_attachment_sensitivity", weight: 1.5 },
        { key: "connection_interpersonal_trust", weight: 0.75 },
        { key: "connection_attachment_confidence", weight: -0.5 }
      ]
    }
  ]
},

  {
    id: "dream_date_capture_01",
    type: "assessmentCard",
    title: "Initial Preference Capture",
    prompt: "Provide a little more detail so the system can refine compatibility reconstruction.",
    description: "Open-ended answers help expand early preference modelling.",
    status: "active",
    priority: 50,
    ctaLabel: "Submit description",
    saveMode: "single",
    effect: {
      candidateReduction: 320,
      confidenceIncrease: 5,
      stageLabel: "Narrative preference signals integrated into compatibility reconstruction"
    },
    meta: {
      category: "reflection",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:30:00Z"
    },
    questions: [
      {
        id: "dream_date_text",
        type: "freeText",
        prompt: "Describe your ideal date in as much detail as you like.",
        config: {
          placeholder: "A dream date might involve...",
          maxLength: 1200,
          minLength: 20,
          rows: 5
        }
      }
    ]
  },

    {
    id: "conversation_priorities_01",
    type: "assessmentCard",
    title: "Conversation Priorities",
    prompt: "Help the system understand how you weight different traits in a connection.",
    description: "Ordered preferences help refine trait weighting.",
    status: "active",
    priority: 60,
    ctaLabel: "Save ranking",
    saveMode: "single",
    effect: {
      candidateReduction: 140,
      confidenceIncrease: 2,
      stageLabel: "Priority weighting integrated into compatibility scoring"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:40:00Z"
    },
    questions: [
      {
        id: "priority_ranking",
        type: "ranking",
        prompt: "Rank these from most to least important in a connection.",
        config: {
          options: [
            { value: "humour", label: "Humour" },
            { value: "honesty", label: "Honesty" },
            { value: "curiosity", label: "Curiosity" },
            { value: "warmth", label: "Warmth" }
          ]
        }
      }
    ]
  },

  {
    id: "environmental_preference_01",
    type: "assessmentCard",
    title: "Environmental Preference Mapping",
    prompt: "Help the system refine atmospheric compatibility modelling.",
    description: "Context preferences can improve conversational fit.",
    status: "active",
    priority: 70,
    ctaLabel: "Save preference",
    saveMode: "single",
    effect: {
      candidateReduction: 120,
      confidenceIncrease: 2,
      stageLabel: "Environmental preference signals integrated into compatibility modelling"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:50:00Z"
    },
    questions: [
      {
        id: "environment_choice",
        type: "imageChoice",
        prompt: "Which setting feels most conducive to a meaningful conversation?",
        config: {
          columns: 2,
          options: [
            {
              value: "quiet_bar",
              label: "Quiet bar",
              imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "night_walk",
              label: "Night walk",
              imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "museum_cafe",
              label: "Museum cafÃ©",
              imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "kitchen_party",
              label: "Kitchen at a party",
              imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80"
            }
          ]
        }
      }
    ]
  }
];
