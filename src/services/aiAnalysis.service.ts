import OpenAI from 'openai';
import { TestAttemptDocument, AttemptedQuestion, SubjectAnalytics } from '../models/testAttempt.model';
import { TestDocument, Question } from '../models/test.model';
import AIAnalysisCache from '../models/aiAnalysisCache.model';
import config from '../config/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export interface TopicAnalysis {
  topic: string;
  subject: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  performance: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
}

export interface AIRecommendation {
  type: 'strength' | 'weakness' | 'time_management' | 'strategy';
  subject?: string;
  topic?: string;
  title: string;
  description: string;
  actionItems: string[];
  priority: 'High' | 'Medium' | 'Low';
}

export interface DetailedAIAnalysis {
  overallPerformance: {
    grade: string;
    percentile: number;
    strengths: string[];
    weaknesses: string[];
  };
  topicAnalysis: TopicAnalysis[];
  recommendations: AIRecommendation[];
  studyPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  conceptualInsights: {
    masteredConcepts: string[];
    strugglingConcepts: string[];
    conceptConnections: string[];
  };
  timeManagementAnalysis: {
    efficiency: number;
    pacing: 'Too Fast' | 'Optimal' | 'Too Slow';
    recommendations: string[];
  };
}

class ImprovedAIAnalysisService {
  /**
   * Improved topic extraction with better categorization
   */
  private async extractTopicsFromQuestions(questions: Question[], subject: string): Promise<{ [questionIndex: number]: string }> {
    const questionTopicMap: { [questionIndex: number]: string } = {};
    
    // Process questions in batches to avoid token limits
    const batchSize = 10;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchMap = await this.processBatchTopics(batch, subject, i);
      Object.assign(questionTopicMap, batchMap);
    }
    
    return questionTopicMap;
  }

  private async processBatchTopics(questions: Question[], subject: string, startIndex: number): Promise<{ [questionIndex: number]: string }> {
    const questionsList = questions.map((q, idx) => `${startIndex + idx}: ${q.questionText}`).join('\n\n');
    
    const prompt = `
    For Mathematics questions, use the following topic labels:
- Set Theory (Sets, Relations and Functions)
- Complex Numbers & Quadratic Equations
- Matrices & Determinants
- Permutations & Combinations
- Binomial Theorem
- Sequences & Series
- Limits, Continuity & Differentiability
- Integral Calculus
- Differential Equations
- Coordinate Geometry
- 3D Geometry
- Vector Algebra
- Statistics & Probability
- Trigonometry

For Physics questions, use the following topic labels:
- Measurement (Units, Dimensions, Errors)
- Kinematics
- Laws of Motion
- Work, Energy & Power
- Rotational Motion
- Gravitation
- Properties of Solids & Liquids
- Thermodynamics
- Kinetic Theory of Gases
- Oscillations & Waves
- Electrostatics
- Current Electricity
- Magnetism (Magnetic Effects of Current & Magnetism)
- Electromagnetic Induction & AC
- Electromagnetic Waves
- Optics
- Dual Nature of Matter & Radiation
- Atoms & Nuclei
- Electronic Devices
- Experimental Skills

For Chemistry questions, use the following topic labels:

-- Physical Chemistry --
- Basic Concepts of Chemistry (Mole Concept, Stoichiometry)
- Atomic Structure
- Chemical Bonding & Molecular Structure
- Thermodynamics
- Solutions
- Equilibrium
- Redox Reactions & Electrochemistry
- Chemical Kinetics

-- Inorganic Chemistry --
- Periodic Table & Periodicity
- p-Block Elements
- d-Block Elements
- f-Block Elements
- Coordination Compounds

-- Organic Chemistry --
- Purification & Characterisation of Organic Compounds
- Basic Principles of Organic Chemistry
- Hydrocarbons
- Haloalkanes & Haloarenes
- Alcohols, Phenols & Ethers
- Aldehydes, Ketones & Carboxylic Acids
- Amines & Diazonium Compounds
- Biomolecules
- Principles of Practical Organic Chemistry
    
    Questions:
    ${questionsList}
    
    Return ONLY a JSON object mapping question indices to topics:
    {
      "0": "Basic Arithmetic",
      "1": "Fractions",
      "2": "Geometry"
    }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Lower temperature for more consistent categorization
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          // Convert string indices to numbers and adjust for batch offset
          const result: { [questionIndex: number]: string } = {};
          Object.entries(parsed).forEach(([idx, topic]) => {
            result[startIndex + parseInt(idx)] = topic as string;
          });
          return result;
        }
      }
      return {};
    } catch (error) {
      console.error('Error extracting topics for batch:', error);
      // Fallback to rule-based topic extraction
      return this.fallbackTopicExtraction(questions, subject, startIndex);
    }
  }

  /**
   * Fallback rule-based topic extraction when AI fails
   */
  private fallbackTopicExtraction(questions: Question[], subject: string, startIndex: number): { [questionIndex: number]: string } {
    const result: { [questionIndex: number]: string } = {};
    
    questions.forEach((question, idx) => {
      const questionText = question.questionText.toLowerCase();
      const actualIndex = startIndex + idx;
      
      if (subject.toLowerCase().includes('math')) {
        // Rule-based math categorization
        if (/^\s*\d+\s*[+\-×*÷/]\s*\d+/.test(questionText) || 
            /what is \d+ [+\-×*÷/] \d+/.test(questionText) ||
            /calculate \d+ [+\-×*÷/] \d+/.test(questionText)) {
          result[actualIndex] = 'Basic Arithmetic';
        } else if (questionText.includes('fraction') || questionText.includes('/') && questionText.includes('of')) {
          result[actualIndex] = 'Fractions';
        } else if (questionText.includes('%') || questionText.includes('percent')) {
          result[actualIndex] = 'Percentages';
        } else if (questionText.includes('area') || questionText.includes('perimeter') || 
                   questionText.includes('triangle') || questionText.includes('circle') ||
                   questionText.includes('rectangle') || questionText.includes('square')) {
          result[actualIndex] = 'Geometry';
        } else if (questionText.includes('sin') || questionText.includes('cos') || 
                   questionText.includes('tan') || questionText.includes('angle')) {
          result[actualIndex] = 'Trigonometry';
        } else if (questionText.includes('derivative') || questionText.includes('integral') || 
                   questionText.includes('limit') || questionText.includes('dx')) {
          result[actualIndex] = 'Calculus';
        } else if (questionText.includes('x') && (questionText.includes('solve') || questionText.includes('='))) {
          result[actualIndex] = 'Basic Algebra';
        } else if (questionText.includes('mean') || questionText.includes('median') || 
                   questionText.includes('mode') || questionText.includes('probability')) {
          result[actualIndex] = 'Statistics';
        } else {
          result[actualIndex] = 'General Mathematics';
        }
      } else if (subject.toLowerCase().includes('physics')) {
        if (questionText.includes('force') || questionText.includes('motion') || 
            questionText.includes('velocity') || questionText.includes('acceleration')) {
          result[actualIndex] = 'Mechanics';
        } else if (questionText.includes('heat') || questionText.includes('temperature') || 
                   questionText.includes('thermal')) {
          result[actualIndex] = 'Thermodynamics';
        } else if (questionText.includes('electric') || questionText.includes('magnetic') || 
                   questionText.includes('current') || questionText.includes('voltage')) {
          result[actualIndex] = 'Electromagnetism';
        } else if (questionText.includes('light') || questionText.includes('mirror') || 
                   questionText.includes('lens') || questionText.includes('reflection')) {
          result[actualIndex] = 'Optics';
        } else {
          result[actualIndex] = 'General Physics';
        }
      } else if (subject.toLowerCase().includes('chemistry')) {
        if (questionText.includes('organic') || questionText.includes('carbon') || 
            questionText.includes('hydrocarbon')) {
          result[actualIndex] = 'Organic Chemistry';
        } else if (questionText.includes('acid') || questionText.includes('base') || 
                   questionText.includes('salt') || questionText.includes('metal')) {
          result[actualIndex] = 'Inorganic Chemistry';
        } else if (questionText.includes('reaction rate') || questionText.includes('equilibrium') || 
                   questionText.includes('thermodynamics')) {
          result[actualIndex] = 'Physical Chemistry';
        } else {
          result[actualIndex] = 'General Chemistry';
        }
      } else {
        result[actualIndex] = `General ${subject}`;
      }
    });
    
    return result;
  }

  /**
   * Analyze topic-wise performance with improved topic mapping
   */
  private async analyzeTopicPerformance(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<TopicAnalysis[]> {
    const topicAnalysis: TopicAnalysis[] = [];
    
    // Process each section
    for (const section of test.sections) {
      const sectionIndex = test.sections.indexOf(section);
      
      // Get topic mapping for all questions in this section
      const questionTopicMap = await this.extractTopicsFromQuestions(section.questions, section.subject);
      
      // Group questions by topic
      const topicGroups: { [topic: string]: number[] } = {};
      Object.entries(questionTopicMap).forEach(([questionIndex, topic]) => {
        if (!topicGroups[topic]) {
          topicGroups[topic] = [];
        }
        topicGroups[topic].push(parseInt(questionIndex));
      });
      
      // Analyze each topic
      Object.entries(topicGroups).forEach(([topic, questionIndices]) => {
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          aq => aq.sectionIndex === sectionIndex && questionIndices.includes(aq.questionIndex)
        );
        
        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(q => q.isCorrect).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;
          const averageTime = topicQuestions.reduce((sum, q) => sum + q.timeTaken, 0) / topicQuestions.length;
          
          // Get average difficulty for this topic's questions
          const topicQuestionObjects = questionIndices.map(idx => section.questions[idx]).filter(Boolean);
          const avgDifficulty = this.calculateAverageDifficulty(topicQuestionObjects);
          
          topicAnalysis.push({
            topic,
            subject: section.subject,
            questionsAttempted: topicQuestions.length,
            correctAnswers,
            accuracy,
            averageTime,
            difficulty: avgDifficulty,
            performance: this.getPerformanceLevel(accuracy)
          });
        }
      });
    }
    
    return topicAnalysis;
  }

  /**
   * Generate AI-powered recommendations with improved context
   */
  private async generateAIRecommendations(
    testAttempt: TestAttemptDocument,
    topicAnalysis: TopicAnalysis[]
  ): Promise<AIRecommendation[]> {
    const analysisData = {
      overallScore: testAttempt.scorePercent,
      subjectAnalytics: testAttempt.subjectAnalytics,
      topicAnalysis: topicAnalysis,
      timeManagement: {
        totalTime: testAttempt.totalTimeTaken,
        averageTimePerQuestion: testAttempt.totalTimeTaken / testAttempt.totalQuestions,
        slowestQuestions: testAttempt.slowestQuestions
      },
      changedAnswers: testAttempt.changedAnswersCount
    };

    const prompt = `
    As an expert educational AI, analyze this student's test performance and provide detailed, specific recommendations.
    
    Performance Data:
    ${JSON.stringify(analysisData, null, 2)}
    
    Important: When providing recommendations, be specific about the level of topics:
    - For "Basic Arithmetic", suggest fundamental number operations practice
    - For "Fractions", focus on fraction operations and word problems
    - For "Calculus", suggest advanced mathematical concepts
    - Match the recommendation level to the actual topic difficulty
    
    Provide recommendations in the following JSON format:
    {
      "recommendations": [
        {
          "type": "strength|weakness|time_management|strategy",
          "subject": "subject name if applicable",
          "topic": "topic name if applicable", 
          "title": "Brief title",
          "description": "Detailed description matching the topic level",
          "actionItems": ["specific action 1", "specific action 2"],
          "priority": "High|Medium|Low"
        }
      ]
    }
    
    Focus on:
    1. Specific weak topics that need improvement (match difficulty level)
    2. Strong areas to maintain
    3. Time management strategies
    4. Study techniques appropriate for the topic level
    5. Exam strategies
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          return parsed.recommendations || [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.generateFallbackRecommendations(topicAnalysis);
    }
  }

  /**
   * Fallback recommendations when AI fails
   */
  private generateFallbackRecommendations(topicAnalysis: TopicAnalysis[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // Add recommendations for weak topics
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    weakTopics.forEach(topic => {
      let actionItems: string[] = [];
      
      // Customize action items based on topic
      if (topic.topic === 'Basic Arithmetic') {
        actionItems = [
          'Practice basic addition, subtraction, multiplication, and division daily',
          'Use flashcards for multiplication tables',
          'Solve simple word problems involving basic operations',
          'Check your work by doing reverse operations'
        ];
      } else if (topic.topic === 'Fractions') {
        actionItems = [
          'Review fraction basics: numerator and denominator',
          'Practice adding and subtracting fractions with different denominators',
          'Learn to convert between fractions, decimals, and percentages',
          'Solve fraction word problems'
        ];
      } else if (topic.topic === 'Calculus') {
        actionItems = [
          'Review fundamental calculus concepts and theorems',
          'Practice derivative and integral calculations',
          'Work on limit problems step by step',
          'Study applications of calculus in real-world scenarios'
        ];
      } else {
        actionItems = [
          `Review ${topic.topic} fundamentals and key concepts`,
          `Practice ${topic.topic} problems daily`,
          `Seek additional resources for ${topic.topic}`,
          'Ask for help from teachers or tutors'
        ];
      }
      
      recommendations.push({
        type: 'weakness',
        subject: topic.subject,
        topic: topic.topic,
        title: `Improve ${topic.topic} Performance`,
        description: `Your accuracy in ${topic.topic} is ${topic.accuracy.toFixed(1)}%, which needs improvement. Focus on building a strong foundation in this area.`,
        actionItems,
        priority: topic.accuracy < 40 ? 'High' : 'Medium'
      });
    });
    
    return recommendations;
  }

  /**
   * Generate comprehensive study plan
   */
  private async generateStudyPlan(
    topicAnalysis: TopicAnalysis[],
    recommendations: AIRecommendation[]
  ): Promise<DetailedAIAnalysis['studyPlan']> {
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    const strongTopics = topicAnalysis.filter(t => t.accuracy >= 80);
    
    const prompt = `
    Based on the following performance analysis, create a structured study plan that matches the difficulty level of topics:
    
    Weak Topics: ${weakTopics.map(t => `${t.topic} (${t.subject}) - ${t.accuracy}%`).join(', ')}
    Strong Topics: ${strongTopics.map(t => `${t.topic} (${t.subject}) - ${t.accuracy}%`).join(', ')}
    
    Recommendations: ${recommendations.map(r => r.title).join(', ')}
    
    Important: Match study activities to topic difficulty:
    - For "Basic Arithmetic": suggest simple practice exercises
    - For "Calculus": suggest advanced problem-solving
    - For "Fractions": suggest appropriate level practice
    
    Provide a study plan in JSON format:
    {
      "immediate": ["tasks for next 1-2 days"],
      "shortTerm": ["tasks for next 1-2 weeks"], 
      "longTerm": ["tasks for next 1-2 months"]
    }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(jsonStr);
        }
      }
      return this.generateFallbackStudyPlan(weakTopics);
    } catch (error) {
      console.error('Error generating study plan:', error);
      return this.generateFallbackStudyPlan(weakTopics);
    }
  }

  private generateFallbackStudyPlan(weakTopics: TopicAnalysis[]): DetailedAIAnalysis['studyPlan'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    weakTopics.forEach(topic => {
      if (topic.topic === 'Basic Arithmetic') {
        immediate.push('Practice 20 basic arithmetic problems');
        shortTerm.push('Complete arithmetic worksheets daily');
        longTerm.push('Master all basic arithmetic operations');
      } else if (topic.topic === 'Fractions') {
        immediate.push('Review fraction basics and practice 10 problems');
        shortTerm.push('Practice fraction operations daily');
        longTerm.push('Master fraction-decimal-percentage conversions');
      } else {
        immediate.push(`Review ${topic.topic} fundamentals`);
        shortTerm.push(`Practice ${topic.topic} problems regularly`);
        longTerm.push(`Achieve mastery in ${topic.topic}`);
      }
    });
    
    return { immediate, shortTerm, longTerm };
  }

  /**
   * Main method to generate detailed AI analysis
   */
  async generateDetailedAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<DetailedAIAnalysis> {
    try {
      // Check if analysis already exists in cache
      const cachedAnalysis = await AIAnalysisCache.findOne({ 
        testAttemptId: testAttempt._id 
      });
      
      if (cachedAnalysis) {
        console.log('Returning cached AI analysis');
        return cachedAnalysis.analysis;
      }

      console.log('Generating new AI analysis');
      
      // Analyze topic-wise performance with improved categorization
      const topicAnalysis = await this.analyzeTopicPerformance(testAttempt, test);
      
      // Generate AI recommendations
      const recommendations = await this.generateAIRecommendations(testAttempt, topicAnalysis);
      
      // Generate study plan
      const studyPlan = await this.generateStudyPlan(topicAnalysis, recommendations);
      
      // Analyze conceptual insights
      const conceptualInsights = this.analyzeConceptualInsights(topicAnalysis);
      
      // Analyze time management
      const timeManagementAnalysis = this.analyzeTimeManagement(testAttempt);
      
      const analysis: DetailedAIAnalysis = {
        overallPerformance: {
          grade: this.calculateGrade(testAttempt.scorePercent),
          percentile: this.calculatePercentile(testAttempt.scorePercent),
          strengths: topicAnalysis.filter(t => t.accuracy >= 80).map(t => t.topic),
          weaknesses: topicAnalysis.filter(t => t.accuracy < 60).map(t => t.topic)
        },
        topicAnalysis,
        recommendations,
        studyPlan,
        conceptualInsights,
        timeManagementAnalysis
      };

      // Save analysis to cache
      await AIAnalysisCache.create({
        testAttemptId: testAttempt._id,
        userId: testAttempt.user,
        analysis
      });

      return analysis;
    } catch (error) {
      console.error('Error generating detailed analysis:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  // Helper methods (same as original)
  private calculateAverageDifficulty(questions: Question[]): 'Easy' | 'Medium' | 'Hard' {
    const difficultyScores = questions.map(q => {
      switch (q.difficulty) {
        case 'Easy': return 1;
        case 'Medium': return 2;
        case 'Hard': return 3;
        default: return 2;
      }
    });
    
    const avgScore = difficultyScores.reduce((sum, score) => sum + score, 0) / difficultyScores.length;
    
    if (avgScore <= 1.5) return 'Easy';
    if (avgScore <= 2.5) return 'Medium';
    return 'Hard';
  }

  private getPerformanceLevel(accuracy: number): 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' {
    if (accuracy >= 90) return 'Excellent';
    if (accuracy >= 75) return 'Good';
    if (accuracy >= 60) return 'Average';
    return 'Needs Improvement';
  }

  private calculateGrade(scorePercent: number): string {
    if (scorePercent >= 90) return 'A+';
    if (scorePercent >= 80) return 'A';
    if (scorePercent >= 70) return 'B+';
    if (scorePercent >= 60) return 'B';
    if (scorePercent >= 50) return 'C+';
    if (scorePercent >= 40) return 'C';
    return 'D';
  }

  private calculatePercentile(scorePercent: number): number {
    // Simplified percentile calculation
    return Math.min(95, Math.max(5, scorePercent + Math.random() * 10 - 5));
  }

  private analyzeConceptualInsights(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['conceptualInsights'] {
    const masteredConcepts = topicAnalysis
      .filter(t => t.accuracy >= 85)
      .map(t => t.topic);
    
    const strugglingConcepts = topicAnalysis
      .filter(t => t.accuracy < 60)
      .map(t => t.topic);
    
    const conceptConnections = [
      "Strong performance in Basic Arithmetic provides foundation for advanced math",
      "Fraction skills are essential for algebra and geometry",
      "Mastering fundamentals leads to success in complex topics"
    ];
    
    return {
      masteredConcepts,
      strugglingConcepts,
      conceptConnections
    };
  }

  private analyzeTimeManagement(testAttempt: TestAttemptDocument): DetailedAIAnalysis['timeManagementAnalysis'] {
    const avgTimePerQuestion = testAttempt.totalTimeTaken / testAttempt.totalQuestions;
    const idealTimePerQuestion = 90; // seconds
    
    const efficiency = Math.min(100, (idealTimePerQuestion / avgTimePerQuestion) * 100);
    
    let pacing: 'Too Fast' | 'Optimal' | 'Too Slow';
    if (avgTimePerQuestion < idealTimePerQuestion * 0.7) {
      pacing = 'Too Fast';
    } else if (avgTimePerQuestion > idealTimePerQuestion * 1.3) {
      pacing = 'Too Slow';
    } else {
      pacing = 'Optimal';
    }
    
    const recommendations = [];
    if (pacing === 'Too Fast') {
      recommendations.push('Slow down and double-check your answers');
      recommendations.push('Spend more time reading questions carefully');
    } else if (pacing === 'Too Slow') {
      recommendations.push('Practice solving questions under time pressure');
      recommendations.push('Focus on eliminating obviously wrong options quickly');
    } else {
      recommendations.push('Maintain your current pacing strategy');
    }
    
    return {
      efficiency,
      pacing,
      recommendations
    };
  }
}

export default new ImprovedAIAnalysisService();