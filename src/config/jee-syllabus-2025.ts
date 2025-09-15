export const JEE_SYLLABUS_2025 = {
  MATHEMATICS: {
    "UNIT 1": {
      name: "SETS, RELATIONS AND FUNCTIONS",
      topics: [
        "Sets and Representation",
        "Union and Intersection",
        "Complement of Sets", 
        "Power Set",
        "Relations and Types",
        "Equivalence Relations",
        "Functions - One-One, Into, Onto",
        "Composition of Functions"
      ]
    },
    "UNIT 2": {
      name: "COMPLEX NUMBERS AND QUADRATIC EQUATIONS", 
      topics: [
        "Complex Numbers as Ordered Pairs",
        "Argand Diagram",
        "Modulus and Argument",
        "Quadratic Equations in Real System",
        "Quadratic Equations in Complex System",
        "Relations Between Roots and Coefficients",
        "Nature of Roots"
      ]
    },
    "UNIT 7": {
      name: "LIMIT, CONTINUITY AND DIFFERENTIABILITY",
      topics: [
        "Real-Valued Functions",
        "Polynomial Functions",
        "Trigonometric Functions", 
        "Logarithmic Functions",
        "Exponential Functions",
        "Limits and Continuity",
        "Differentiation Rules",
        "Chain Rule",
        "Applications of Derivatives",
        "Maxima and Minima"
      ]
    },
    "UNIT 8": {
      name: "INTEGRAL CALCULUS",
      topics: [
        "Integration as Anti-Derivative",
        "Fundamental Integrals",
        "Integration by Substitution",
        "Integration by Parts", 
        "Integration by Partial Fractions",
        "Definite Integrals",
        "Area Under Curves"
      ]
    }
  },
  
  PHYSICS: {
    "UNIT 2": {
      name: "KINEMATICS",
      topics: [
        "Frame of Reference",
        "Motion in Straight Line",
        "Speed and Velocity",
        "Uniform and Non-Uniform Motion",
        "Uniformly Accelerated Motion",
        "Velocity-Time Graphs",
        "Position-Time Graphs", 
        "Relative Velocity",
        "Projectile Motion",
        "Uniform Circular Motion"
      ]
    },
    "UNIT 3": {
      name: "LAWS OF MOTION",
      topics: [
        "Force and Inertia",
        "Newton's First Law",
        "Newton's Second Law",
        "Newton's Third Law",
        "Conservation of Linear Momentum",
        "Static and Kinetic Friction",
        "Centripetal Force",
        "Banking of Roads"
      ]
    },
    "UNIT 7": {
      name: "PROPERTIES OF SOLIDS AND LIQUIDS",
      topics: [
        "Elastic Behaviour",
        "Stress-Strain Relationship", 
        "Hooke's Law",
        "Young's Modulus",
        "Fluid Pressure",
        "Pascal's Law",
        "Viscosity and Stoke's Law",
        "Surface Tension",
        "Heat and Temperature",
        "Thermal Expansion",
        "Heat Transfer Methods"
      ]
    }
  },

  CHEMISTRY: {
    "UNIT 1": {
      name: "SOME BASIC CONCEPTS IN CHEMISTRY",
      topics: [
        "Matter and Its Nature",
        "Dalton's Atomic Theory",
        "Atom, Molecule, Element, Compound",
        "Laws of Chemical Combination",
        "Atomic and Molecular Masses",
        "Mole Concept",
        "Percentage Composition",
        "Empirical and Molecular Formulae",
        "Chemical Equations and Stoichiometry"
      ]
    },
    "UNIT 2": {
      name: "ATOMIC STRUCTURE", 
      topics: [
        "Electromagnetic Radiation",
        "Photoelectric Effect",
        "Hydrogen Spectrum",
        "Bohr Model",
        "Quantum Mechanical Model",
        "Atomic Orbitals",
        "Quantum Numbers",
        "Electronic Configuration",
        "Aufbau Principle",
        "Pauli's Exclusion Principle",
        "Hund's Rule"
      ]
    },
    "UNIT 3": {
      name: "CHEMICAL BONDING AND MOLECULAR STRUCTURE",
      topics: [
        "Ionic Bonding",
        "Covalent Bonding", 
        "Lattice Enthalpy",
        "Electronegativity",
        "VSEPR Theory",
        "Hybridization",
        "Molecular Orbital Theory",
        "Bond Order and Bond Length",
        "Hydrogen Bonding"
      ]
    }
  }
};

export const getTopicFromSyllabus = (questionText: string, subject: string): string => {
  const syllabusData = JEE_SYLLABUS_2025[subject.toUpperCase() as keyof typeof JEE_SYLLABUS_2025];
  
  if (!syllabusData) return `General ${subject}`;
  
  // Enhanced keyword matching based on syllabus
  const text = questionText.toLowerCase();
  
  for (const unit of Object.values(syllabusData)) {
    for (const topic of unit.topics) {
      const topicKeywords = topic.toLowerCase().split(/[\s-]+/);
      
      if (topicKeywords.some(keyword => 
        keyword.length > 3 && text.includes(keyword)
      )) {
        return topic;
      }
    }
  }
  
  return `General ${subject}`;
};
