import OpenAI from 'openai';
import { JEE_SYLLABUS_2025, getTopicFromSyllabus } from '../config/jee-syllabus-2025';
import { TestAttemptDocument } from '../models/testAttempt.model';
import { TestDocument, Question } from '../models/test.model';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export interface TopicAnalysis {
  topic: string;
  subject: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  performance: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  // JEE-specific fields
  unit?: string;
  syllabusAlignment?: 'High' | 'Medium' | 'Low';
  recommendedStudyTime?: number;
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
  // JEE-specific analysis
  examSpecific?: {
    examType: string;
    syllabusCompliance: number;
    priorityTopics: string[];
  };
}

class MockAIAnalysisService {
  /**
   * Generate mock detailed analysis with topic categorization
   */
  async generateDetailedAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument,
    examType: string = 'general'
  ): Promise<DetailedAIAnalysis> {
    try {
      // Use JEE-specific analysis if exam type is JEE
      if (examType.toLowerCase().includes('jee')) {
        return this.generateJEEAnalysis(testAttempt, test);
      }
      
      // Generate topic analysis based on actual question content
      const topicAnalysis = this.generateTopicAnalysis(testAttempt, test);
      
      // Generate mock recommendations
      const recommendations = this.generateRecommendations(testAttempt, topicAnalysis);
      
      // Generate mock study plan
      const studyPlan = this.generateStudyPlan(topicAnalysis);
      
      // Generate mock conceptual insights
      const conceptualInsights = this.generateConceptualInsights(topicAnalysis);
      
      // Generate mock time management analysis
      const timeManagementAnalysis = this.generateMockTimeManagementAnalysis(testAttempt);
      
      return {
        overallPerformance: {
          grade: this.calculateGrade(testAttempt.scorePercent),
          percentile: this.calculateMockPercentile(testAttempt.scorePercent),
          strengths: topicAnalysis.filter(t => t.accuracy >= 80).map(t => t.topic),
          weaknesses: topicAnalysis.filter(t => t.accuracy < 60).map(t => t.topic)
        },
        topicAnalysis,
        recommendations,
        studyPlan,
        conceptualInsights,
        timeManagementAnalysis
      };
    } catch (error) {
      console.error('Error generating mock analysis:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  /**
   * Generate JEE Main 2025 specific analysis
   */
  async generateJEEAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<DetailedAIAnalysis> {
    const topicAnalysis: TopicAnalysis[] = [];
    
    for (const section of test.sections) {
      const questionTopicMap = await this.extractJEETopics(section.questions, section.subject);
      
      // Group by topic and analyze
      const topicGroups: { [topic: string]: number[] } = {};
      Object.entries(questionTopicMap).forEach(([qIndex, topic]) => {
        if (!topicGroups[topic]) topicGroups[topic] = [];
        topicGroups[topic].push(parseInt(qIndex));
      });

      Object.entries(topicGroups).forEach(([topic, questionIndices]) => {
        const sectionIndex = test.sections.indexOf(section);
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          aq => aq.sectionIndex === sectionIndex && questionIndices.includes(aq.questionIndex)
        );

        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(q => q.isCorrect).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;
          const averageTime = topicQuestions.reduce((sum, q) => sum + q.timeTaken, 0) / topicQuestions.length;
          
          topicAnalysis.push({
            topic,
            subject: section.subject,
            questionsAttempted: topicQuestions.length,
            correctAnswers,
            accuracy,
            averageTime,
            difficulty: this.calculateAverageDifficulty(questionIndices.map(idx => section.questions[idx])),
            performance: this.getPerformanceLevel(accuracy),
            unit: this.getUnitForTopic(topic, section.subject),
            syllabusAlignment: this.getSyllabusAlignment(topic, section.subject),
            recommendedStudyTime: this.calculateStudyTime(accuracy, topicQuestions.length)
          });
        }
      });
    }

    const recommendations = await this.generateJEERecommendations(topicAnalysis);
    const studyPlan = this.generateJEEStudyPlan(topicAnalysis);
    const conceptualInsights = this.generateConceptualInsights(topicAnalysis);
    const timeManagementAnalysis = this.generateMockTimeManagementAnalysis(testAttempt);

    return {
      overallPerformance: {
        grade: this.calculateGrade(testAttempt.scorePercent),
        percentile: this.calculateMockPercentile(testAttempt.scorePercent),
        strengths: topicAnalysis.filter(t => t.accuracy >= 80).map(t => t.topic),
        weaknesses: topicAnalysis.filter(t => t.accuracy < 60).map(t => t.topic)
      },
      topicAnalysis,
      recommendations,
      studyPlan,
      conceptualInsights,
      timeManagementAnalysis,
      examSpecific: {
        examType: 'JEE Main 2025',
        syllabusCompliance: this.calculateSyllabusCompliance(topicAnalysis),
        priorityTopics: topicAnalysis.filter(t => t.accuracy < 50).map(t => t.topic)
      }
    };
  }

  /**
   * Extract JEE topics using AI
   */
  async extractJEETopics(questions: Question[], subject: string): Promise<{ [questionIndex: number]: string }> {
    // Use fallback if OpenAI is not available
    if (!openai) {
      console.warn('OpenAI API key not found, using fallback topic mapping');
      return this.fallbackTopicMapping(questions, subject);
    }

    const syllabusTopics = this.getSyllabusTopics(subject);
    
    const prompt = `
    Analyze each ${subject} question and map to JEE Main 2025 syllabus topics.
    
    Available topics for ${subject}:
    ${syllabusTopics.join(', ')}
    
    Questions:
    ${questions.map((q, i) => `${i}: ${q.questionText}`).join('\n')}
    
    Return JSON mapping question index to exact syllabus topic:
    { "0": "Projectile Motion", "1": "Chemical Bonding" }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return this.fallbackTopicMapping(questions, subject);
    } catch (error) {
      console.error('AI topic extraction failed:', error);
      return this.fallbackTopicMapping(questions, subject);
    }
  }

  /**
   *  topic analysis that properly categorizes questions by content
   */
  private generateTopicAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): TopicAnalysis[] {
    const topicAnalysis: TopicAnalysis[] = [];
    
    // Process each section
    test.sections.forEach((section, sectionIndex) => {
      // Analyze each question to determine its actual topic
      const questionTopics = section.questions.map((question, questionIndex) => {
        return {
          questionIndex,
          topic: this.categorizeQuestion(question, section.subject)
        };
      });
      
      // Group questions by topic
      const topicGroups: { [topic: string]: number[] } = {};
      questionTopics.forEach(({ questionIndex, topic }) => {
        if (!topicGroups[topic]) {
          topicGroups[topic] = [];
        }
        topicGroups[topic].push(questionIndex);
      });
      
      // Analyze performance for each topic
      Object.entries(topicGroups).forEach(([topic, questionIndices]) => {
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          aq => aq.sectionIndex === sectionIndex && questionIndices.includes(aq.questionIndex)
        );
        
        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(q => q.isCorrect).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;
          const averageTime = topicQuestions.reduce((sum, q) => sum + q.timeTaken, 0) / topicQuestions.length;
          
          // Get average difficulty for this topic's questions
          const topicQuestionObjects = questionIndices.map(idx => section.questions[idx]);
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
    });
    
    return topicAnalysis;
  }

  /**
   *  question categorization based on content analysis
   */
  private categorizeQuestion(question: Question, subject: string): string {
    const questionText = question.questionText.toLowerCase();
    
    if (subject.toLowerCase().includes('math')) {
      //  math categorization with specific pattern matching
      
      // Basic Arithmetic - Simple operations with numbers
      if (/^\s*\d+\s*[+\-×*÷/]\s*\d+/.test(questionText) || 
          /what is \d+ [+\-×*÷/] \d+/.test(questionText) ||
          /calculate \d+ [+\-×*÷/] \d+/.test(questionText) ||
          /add \d+ and \d+/.test(questionText) ||
          /subtract \d+ from \d+/.test(questionText) ||
          /multiply \d+ by \d+/.test(questionText) ||
          /divide \d+ by \d+/.test(questionText) ||
          questionText.match(/^\s*\d+\s*[+\-]\s*\d+\s*=/) ||
          questionText.match(/^\s*\d+\s*[×*]\s*\d+\s*=/) ||
          questionText.match(/^\s*\d+\s*[÷/]\s*\d+\s*=/)) {
        return 'Basic Arithmetic';
      }
      
      // Fractions
      if (questionText.includes('fraction') || 
          questionText.includes('½') || questionText.includes('¼') || questionText.includes('¾') ||
          /\d+\/\d+/.test(questionText) ||
          questionText.includes('numerator') || questionText.includes('denominator') ||
          questionText.includes('mixed number')) {
        return 'Fractions';
      }
      
      // Decimals
      if (questionText.includes('decimal') || 
          /\d+\.\d+/.test(questionText) ||
          questionText.includes('point') && questionText.includes('number')) {
        return 'Decimals';
      }
      
      // Percentages
      if (questionText.includes('%') || 
          questionText.includes('percent') || 
          questionText.includes('percentage') ||
          questionText.includes('% of')) {
        return 'Percentages';
      }
      
      // Geometry
      if (questionText.includes('area') || questionText.includes('perimeter') || 
          questionText.includes('triangle') || questionText.includes('circle') ||
          questionText.includes('rectangle') || questionText.includes('square') ||
          questionText.includes('polygon') || questionText.includes('diameter') ||
          questionText.includes('radius') || questionText.includes('circumference') ||
          questionText.includes('volume') || questionText.includes('surface area')) {
        return 'Geometry';
      }
      
      // Trigonometry
      if (questionText.includes('sin') || questionText.includes('cos') || 
          questionText.includes('tan') || questionText.includes('angle') ||
          questionText.includes('sine') || questionText.includes('cosine') ||
          questionText.includes('tangent') || questionText.includes('degree')) {
        return 'Trigonometry';
      }
      
      // Calculus - Advanced concepts
      if (questionText.includes('derivative') || questionText.includes('integral') || 
          questionText.includes('limit') || questionText.includes('dx') ||
          questionText.includes('differentiate') || questionText.includes('integrate') ||
          questionText.includes('slope of tangent') || questionText.includes('rate of change')) {
        return 'Calculus';
      }
      
      // Statistics and Probability
      if (questionText.includes('mean') || questionText.includes('median') || 
          questionText.includes('mode') || questionText.includes('probability') ||
          questionText.includes('average') || questionText.includes('standard deviation') ||
          questionText.includes('variance') || questionText.includes('random')) {
        return 'Statistics';
      }
      
      // Basic Algebra - Simple equations
      if ((questionText.includes('x') || questionText.includes('y')) && 
          (questionText.includes('solve') || questionText.includes('=') || questionText.includes('find')) &&
          !questionText.includes('derivative') && !questionText.includes('integral')) {
        // Check if it's simple algebra vs advanced
        if (questionText.includes('quadratic') || questionText.includes('polynomial') ||
            questionText.includes('exponential') || questionText.includes('logarithm')) {
          return 'Advanced Algebra';
        }
        return 'Basic Algebra';
      }
      
      // Advanced Algebra
      if (questionText.includes('quadratic') || questionText.includes('polynomial') ||
          questionText.includes('exponential') || questionText.includes('logarithm') ||
          questionText.includes('matrix') || questionText.includes('system of equations')) {
        return 'Advanced Algebra';
      }
      
      // Default for math
      return 'General Mathematics';
      
    } else if (subject.toLowerCase().includes('physics')) {
      // Physics categorization
      if (questionText.includes('force') || questionText.includes('motion') || 
          questionText.includes('velocity') || questionText.includes('acceleration') ||
          questionText.includes('newton') || questionText.includes('momentum') ||
          questionText.includes('energy') || questionText.includes('work')) {
        return 'Mechanics';
      } else if (questionText.includes('heat') || questionText.includes('temperature') || 
                 questionText.includes('thermal') || questionText.includes('entropy') ||
                 questionText.includes('gas law') || questionText.includes('pressure')) {
        return 'Thermodynamics';
      } else if (questionText.includes('electric') || questionText.includes('magnetic') || 
                 questionText.includes('current') || questionText.includes('voltage') ||
                 questionText.includes('resistance') || questionText.includes('capacitor') ||
                 questionText.includes('inductor')) {
        return 'Electromagnetism';
      } else if (questionText.includes('light') || questionText.includes('mirror') || 
                 questionText.includes('lens') || questionText.includes('reflection') ||
                 questionText.includes('refraction') || questionText.includes('wave')) {
        return 'Optics';
      } else if (questionText.includes('quantum') || questionText.includes('relativity') ||
                 questionText.includes('photon') || questionText.includes('electron') ||
                 questionText.includes('nuclear')) {
        return 'Modern Physics';
      } else {
        return 'General Physics';
      }
      
    } else if (subject.toLowerCase().includes('chemistry')) {
      // Chemistry categorization
      if (questionText.includes('organic') || questionText.includes('carbon') || 
          questionText.includes('hydrocarbon') || questionText.includes('benzene') ||
          questionText.includes('alkane') || questionText.includes('alkene')) {
        return 'Organic Chemistry';
      } else if (questionText.includes('acid') || questionText.includes('base') || 
                 questionText.includes('salt') || questionText.includes('metal') ||
                 questionText.includes('ion') || questionText.includes('compound')) {
        return 'Inorganic Chemistry';
      } else if (questionText.includes('reaction rate') || questionText.includes('equilibrium') || 
                 questionText.includes('thermodynamics') || questionText.includes('kinetics') ||
                 questionText.includes('enthalpy') || questionText.includes('entropy')) {
        return 'Physical Chemistry';
      } else if (questionText.includes('analysis') || questionText.includes('titration') ||
                 questionText.includes('spectroscopy') || questionText.includes('chromatography')) {
        return 'Analytical Chemistry';
      } else {
        return 'General Chemistry';
      }
      
    } else {
      return `General ${subject}`;
    }
  }

  /**
   * Generate  recommendations based on specific topics
   */
  private generateRecommendations(
    testAttempt: TestAttemptDocument,
    topicAnalysis: TopicAnalysis[]
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // Weakness recommendations with topic-specific advice
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    weakTopics.forEach(topic => {
      let actionItems: string[] = [];
      let description = '';
      
      // Customize recommendations based on specific topics
      switch (topic.topic) {
        case 'Basic Arithmetic':
          description = `Your accuracy in Basic Arithmetic is ${topic.accuracy.toFixed(1)}%. This is fundamental for all math topics, so it's important to strengthen these skills.`;
          actionItems = [
            'Practice basic addition, subtraction, multiplication, and division daily',
            'Use flashcards for multiplication tables (1-12)',
            'Solve simple word problems involving basic operations',
            'Check your work by doing reverse operations (e.g., if 5+3=8, then 8-3=5)',
            'Practice mental math for small numbers'
          ];
          break;
          
        case 'Fractions':
          description = `Your accuracy in Fractions is ${topic.accuracy.toFixed(1)}%. Fractions are essential for many advanced math concepts.`;
          actionItems = [
            'Review fraction basics: numerator and denominator concepts',
            'Practice adding and subtracting fractions with different denominators',
            'Learn to convert between fractions, decimals, and percentages',
            'Solve fraction word problems step by step',
            'Practice simplifying fractions to lowest terms'
          ];
          break;
          
        case 'Decimals':
          description = `Your accuracy in Decimals is ${topic.accuracy.toFixed(1)}%. Decimal operations are crucial for real-world math applications.`;
          actionItems = [
            'Practice decimal addition and subtraction with proper alignment',
            'Master decimal multiplication and division',
            'Learn to convert between decimals and fractions',
            'Practice rounding decimals to different place values',
            'Solve real-world problems involving money and measurements'
          ];
          break;
          
        case 'Percentages':
          description = `Your accuracy in Percentages is ${topic.accuracy.toFixed(1)}%. Percentage skills are important for many practical applications.`;
          actionItems = [
            'Learn the relationship between percentages, fractions, and decimals',
            'Practice calculating percentages of numbers',
            'Work on percentage increase and decrease problems',
            'Solve real-world percentage problems (discounts, tips, taxes)',
            'Master the three types of percentage problems'
          ];
          break;
          
        case 'Geometry':
          description = `Your accuracy in Geometry is ${topic.accuracy.toFixed(1)}%. Geometry involves spatial reasoning and formula application.`;
          actionItems = [
            'Memorize key formulas for area and perimeter of basic shapes',
            'Practice identifying and classifying different geometric shapes',
            'Work on word problems involving area and perimeter',
            'Learn to visualize geometric problems',
            'Practice using the Pythagorean theorem'
          ];
          break;
          
        case 'Basic Algebra':
          description = `Your accuracy in Basic Algebra is ${topic.accuracy.toFixed(1)}%. Algebra is the foundation for advanced mathematics.`;
          actionItems = [
            'Practice solving simple linear equations',
            'Learn to isolate variables using inverse operations',
            'Work on substitution problems',
            'Practice translating word problems into algebraic expressions',
            'Master the order of operations with variables'
          ];
          break;
          
        case 'Calculus':
          description = `Your accuracy in Calculus is ${topic.accuracy.toFixed(1)}%. This advanced topic requires strong algebra and trigonometry foundations.`;
          actionItems = [
            'Review fundamental calculus concepts and theorems',
            'Practice derivative rules and applications',
            'Work on integration techniques step by step',
            'Study limit problems and continuity',
            'Apply calculus to real-world rate and optimization problems'
          ];
          break;
          
        default:
          description = `Your accuracy in ${topic.topic} is ${topic.accuracy.toFixed(1)}%, which needs improvement.`;
          actionItems = [
            `Review ${topic.topic} fundamentals and key concepts`,
            `Practice ${topic.topic} problems daily`,
            `Seek additional resources for ${topic.topic}`,
            'Ask for help from teachers or tutors',
            'Form study groups to discuss difficult concepts'
          ];
      }
      
      recommendations.push({
        type: 'weakness',
        subject: topic.subject,
        topic: topic.topic,
        title: `Improve ${topic.topic} Performance`,
        description,
        actionItems,
        priority: topic.accuracy < 40 ? 'High' : 'Medium'
      });
    });

    // Strength recommendations
    const strongTopics = topicAnalysis.filter(t => t.accuracy >= 80);
    if (strongTopics.length > 0) {
      const topStrengths = strongTopics.slice(0, 2); // Top 2 strengths
      topStrengths.forEach(topic => {
        recommendations.push({
          type: 'strength',
          subject: topic.subject,
          topic: topic.topic,
          title: `Maintain Excellence in ${topic.topic}`,
          description: `Excellent performance in ${topic.topic} with ${topic.accuracy.toFixed(1)}% accuracy. Keep up the great work!`,
          actionItems: [
            `Continue practicing ${topic.topic} to maintain proficiency`,
            `Help others with ${topic.topic} to reinforce your understanding`,
            `Explore advanced applications of ${topic.topic}`,
            'Use this strength to build confidence in related topics'
          ],
          priority: 'Low'
        });
      });
    }

    // Time management recommendations
    const avgTime = testAttempt.totalTimeTaken / testAttempt.totalQuestions;
    if (avgTime > 120) { // More than 2 minutes per question
      recommendations.push({
        type: 'time_management',
        title: 'Improve Time Management',
        description: 'You\'re spending too much time per question. Work on improving your speed while maintaining accuracy.',
        actionItems: [
          'Practice solving problems under time pressure',
          'Learn to quickly eliminate obviously wrong answers',
          'Skip difficult questions and return to them later',
          'Practice mental math to reduce calculation time'
        ],
        priority: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Generate  study plan based on specific topics
   */
  private generateStudyPlan(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['studyPlan'] {
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Prioritize the weakest topics
    const sortedWeakTopics = weakTopics.sort((a, b) => a.accuracy - b.accuracy);
    
    sortedWeakTopics.forEach((topic, index) => {
      if (index < 2) { // Focus on top 2 weakest topics
        switch (topic.topic) {
          case 'Basic Arithmetic':
            immediate.push('Practice 20 basic arithmetic problems (addition, subtraction, multiplication, division)');
            shortTerm.push('Complete daily arithmetic worksheets for 2 weeks');
            longTerm.push('Master all basic arithmetic operations and achieve 90%+ accuracy');
            break;
            
          case 'Fractions':
            immediate.push('Review fraction basics and practice 15 fraction problems');
            shortTerm.push('Practice fraction operations daily, focusing on different denominators');
            longTerm.push('Master fraction-decimal-percentage conversions and word problems');
            break;
            
          case 'Decimals':
            immediate.push('Practice 10 decimal addition and subtraction problems');
            shortTerm.push('Work on decimal multiplication and division daily');
            longTerm.push('Achieve fluency in all decimal operations and real-world applications');
            break;
            
          case 'Percentages':
            immediate.push('Learn percentage-fraction-decimal relationships and practice 10 problems');
            shortTerm.push('Practice percentage calculations in real-world contexts daily');
            longTerm.push('Master all types of percentage problems and applications');
            break;
            
          case 'Geometry':
            immediate.push('Memorize area and perimeter formulas for basic shapes');
            shortTerm.push('Practice geometry problems daily, focusing on word problems');
            longTerm.push('Develop strong spatial reasoning and formula application skills');
            break;
            
          case 'Basic Algebra':
            immediate.push('Practice solving 10 simple linear equations');
            shortTerm.push('Work on algebraic expressions and equation solving daily');
            longTerm.push('Build strong foundation for advanced algebra topics');
            break;
            
          default:
            immediate.push(`Review ${topic.topic} fundamentals and practice key problems`);
            shortTerm.push(`Dedicate 30 minutes daily to ${topic.topic} practice`);
            longTerm.push(`Achieve mastery in ${topic.topic} concepts and applications`);
        }
      }
    });
    
    // Add general study strategies
    immediate.push('Review today\'s test mistakes and understand why answers were wrong');
    shortTerm.push('Take practice tests weekly to track improvement');
    longTerm.push('Build confidence through consistent practice and gradual difficulty increase');
    
    return { immediate, shortTerm, longTerm };
  }

  /**
   * Generate  conceptual insights
   */
  private generateConceptualInsights(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['conceptualInsights'] {
    const masteredConcepts = topicAnalysis
      .filter(t => t.accuracy >= 85)
      .map(t => t.topic);
    
    const strugglingConcepts = topicAnalysis
      .filter(t => t.accuracy < 60)
      .map(t => t.topic);
    
    // Generate more specific concept connections based on actual topics
    const conceptConnections: string[] = [];
    
    if (masteredConcepts.includes('Basic Arithmetic') && strugglingConcepts.includes('Fractions')) {
      conceptConnections.push('Strong arithmetic skills provide a foundation for fraction operations');
    }
    
    if (masteredConcepts.includes('Fractions') && strugglingConcepts.includes('Decimals')) {
      conceptConnections.push('Fraction mastery will help with decimal conversions and operations');
    }
    
    if (masteredConcepts.includes('Basic Algebra') && strugglingConcepts.includes('Geometry')) {
      conceptConnections.push('Algebraic skills can be applied to solve geometric problems');
    }
    
    if (strugglingConcepts.includes('Basic Arithmetic')) {
      conceptConnections.push('Strengthening basic arithmetic is crucial for success in all other math topics');
    }
    
    // Default connections if no specific patterns found
    if (conceptConnections.length === 0) {
      conceptConnections.push('Mathematical concepts build upon each other - mastering fundamentals leads to success in advanced topics');
      conceptConnections.push('Strong performance in basic skills provides confidence for tackling complex problems');
    }
    
    return {
      masteredConcepts,
      strugglingConcepts,
      conceptConnections
    };
  }

  // JEE-specific helper methods
  private getSyllabusTopics(subject: string): string[] {
    const syllabusData = JEE_SYLLABUS_2025[subject.toUpperCase() as keyof typeof JEE_SYLLABUS_2025];
    if (!syllabusData) return [];
    
    return Object.values(syllabusData).flatMap(unit => unit.topics);
  }

  private fallbackTopicMapping(questions: Question[], subject: string): { [questionIndex: number]: string } {
    const result: { [questionIndex: number]: string } = {};
    
    questions.forEach((question, index) => {
      result[index] = getTopicFromSyllabus(question.questionText, subject);
    });
    
    return result;
  }

  private getUnitForTopic(topic: string, subject: string): string {
    const syllabusData = JEE_SYLLABUS_2025[subject.toUpperCase() as keyof typeof JEE_SYLLABUS_2025];
    if (!syllabusData) return 'Unknown Unit';
    
    for (const [unitKey, unitData] of Object.entries(syllabusData)) {
      if (unitData.topics.includes(topic)) {
        return unitData.name;
      }
    }
    return 'Unknown Unit';
  }

  private getSyllabusAlignment(topic: string, subject: string): 'High' | 'Medium' | 'Low' {
    const syllabusTopics = this.getSyllabusTopics(subject);
    return syllabusTopics.includes(topic) ? 'High' : 'Low';
  }

  private calculateStudyTime(accuracy: number, questionCount: number): number {
    if (accuracy < 30) return 8;
    if (accuracy < 60) return 5;
    if (accuracy < 80) return 3;
    return 1;
  }

  private calculateSyllabusCompliance(topicAnalysis: TopicAnalysis[]): number {
    const highAlignment = topicAnalysis.filter(t => t.syllabusAlignment === 'High').length;
    return (highAlignment / topicAnalysis.length) * 100;
  }

  async generateJEERecommendations(topicAnalysis: TopicAnalysis[]): Promise<AIRecommendation[]> {
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    
    // Use fallback if OpenAI is not available
    if (!openai) {
      console.warn('OpenAI API key not found, using fallback JEE recommendations');
      return this.generateFallbackJEERecommendations(weakTopics);
    }
    
    const prompt = `
    Generate JEE Main 2025 specific study recommendations for weak topics:
    ${weakTopics.map(t => `${t.topic} (${t.subject}) - ${t.accuracy}% accuracy`).join('\n')}
    
    Provide JEE-specific study strategies, recommended books, and practice methods.
    Focus on JEE Main exam pattern and difficulty level.
    
    Return JSON array of recommendations with fields: type, subject, topic, title, description, actionItems, priority.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", 
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return this.generateFallbackJEERecommendations(weakTopics);
    } catch (error) {
      return this.generateFallbackJEERecommendations(weakTopics);
    }
  }

  private generateFallbackJEERecommendations(weakTopics: TopicAnalysis[]): AIRecommendation[] {
    return weakTopics.map(topic => ({
      type: 'weakness' as const,
      subject: topic.subject,
      topic: topic.topic,
      title: `Master ${topic.topic} for JEE Main`,
      description: `Focus on ${topic.topic} - a key JEE Main topic with ${topic.accuracy}% accuracy`,
      actionItems: [
        `Study ${topic.topic} from NCERT textbook`,
        `Solve previous year JEE Main questions on ${topic.topic}`,
        `Practice mock tests focusing on ${topic.topic}`,
        `Review concepts daily for ${topic.recommendedStudyTime} hours`
      ],
      priority: (topic.accuracy < 40 ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low'
    }));
  }

  private generateJEEStudyPlan(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['studyPlan'] {
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    weakTopics.slice(0, 2).forEach(topic => {
      immediate.push(`Focus on ${topic.topic} - solve 10 JEE Main previous year questions`);
      shortTerm.push(`Complete ${topic.topic} from NCERT and practice daily for ${topic.recommendedStudyTime} hours`);
      longTerm.push(`Achieve 80%+ accuracy in ${topic.topic} through consistent practice`);
    });
    
    immediate.push('Take JEE Main mock test to assess current level');
    shortTerm.push('Follow JEE Main syllabus systematically');
    longTerm.push('Target JEE Main 2025 with strong conceptual foundation');
    
    return { immediate, shortTerm, longTerm };
  }

  // Helper methods (same as original but included for completeness)
  private generateMockTimeManagementAnalysis(testAttempt: TestAttemptDocument): DetailedAIAnalysis['timeManagementAnalysis'] {
    const avgTimePerQuestion = testAttempt.totalTimeTaken / testAttempt.totalQuestions;
    const idealTimePerQuestion = 90; // seconds
    
    const efficiency = Math.min(100, Math.max(20, (idealTimePerQuestion / avgTimePerQuestion) * 100));
    
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
      recommendations.push('Review your work before submitting');
    } else if (pacing === 'Too Slow') {
      recommendations.push('Practice solving questions under time pressure');
      recommendations.push('Focus on eliminating obviously wrong options quickly');
      recommendations.push('Skip difficult questions and return to them later');
      recommendations.push('Improve mental math skills to reduce calculation time');
    } else {
      recommendations.push('Maintain your current pacing strategy');
      recommendations.push('Continue balancing speed with accuracy');
    }
    
    return {
      efficiency,
      pacing,
      recommendations
    };
  }

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

  private calculateMockPercentile(scorePercent: number): number {
    // Mock percentile calculation with some randomness
    const basePercentile = Math.min(95, Math.max(5, scorePercent * 0.8 + 10));
    return Math.round(basePercentile + (Math.random() * 10 - 5));
  }
}

export default new MockAIAnalysisService();
