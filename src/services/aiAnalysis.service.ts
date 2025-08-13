import OpenAI from 'openai';
import { TestAttemptDocument, AttemptedQuestion, SubjectAnalytics } from '../models/testAttempt.model';
import { TestDocument, Question } from '../models/test.model';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

class AIAnalysisService {
  /**
   * Extract topics from questions using AI
   */
  private async extractTopicsFromQuestions(questions: Question[], subject: string): Promise<string[]> {
    const questionTexts = questions.map(q => q.questionText).join('\n\n');
    
    const prompt = `
    Analyze the following ${subject} questions and identify the specific topics/concepts being tested. 
    Return only a JSON array of topic names, no other text.
    
    Questions:
    ${questionTexts}
    
    Example format: ["Mechanics", "Thermodynamics", "Electromagnetism"]
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      return [];
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Analyze topic-wise performance
   */
  private async analyzeTopicPerformance(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<TopicAnalysis[]> {
    const topicAnalysis: TopicAnalysis[] = [];
    
    // Group questions by subject and extract topics
    for (const section of test.sections) {
      const topics = await this.extractTopicsFromQuestions(section.questions, section.subject);
      
      // For simplicity, we'll assume each question maps to one topic
      // In a real implementation, you might want more sophisticated topic mapping
      const questionsPerTopic = Math.ceil(section.questions.length / topics.length);
      
      topics.forEach((topic, topicIndex) => {
        const startIndex = topicIndex * questionsPerTopic;
        const endIndex = Math.min(startIndex + questionsPerTopic, section.questions.length);
        
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          aq => aq.sectionIndex === test.sections.indexOf(section) &&
                aq.questionIndex >= startIndex &&
                aq.questionIndex < endIndex
        );
        
        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(q => q.isCorrect).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;
          const averageTime = topicQuestions.reduce((sum, q) => sum + q.timeTaken, 0) / topicQuestions.length;
          
          // Determine difficulty based on section questions
          const topicQuestionObjects = section.questions.slice(startIndex, endIndex);
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
   * Generate AI-powered recommendations
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
    As an expert educational AI, analyze this student's test performance and provide detailed recommendations.
    
    Performance Data:
    ${JSON.stringify(analysisData, null, 2)}
    
    Provide recommendations in the following JSON format:
    {
      "recommendations": [
        {
          "type": "strength|weakness|time_management|strategy",
          "subject": "subject name if applicable",
          "topic": "topic name if applicable", 
          "title": "Brief title",
          "description": "Detailed description",
          "actionItems": ["specific action 1", "specific action 2"],
          "priority": "High|Medium|Low"
        }
      ]
    }
    
    Focus on:
    1. Specific weak topics that need improvement
    2. Strong areas to maintain
    3. Time management strategies
    4. Study techniques for different subjects
    5. Exam strategies
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return parsed.recommendations || [];
      }
      return [];
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return [];
    }
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
    Based on the following performance analysis, create a structured study plan:
    
    Weak Topics: ${weakTopics.map(t => `${t.topic} (${t.subject}) - ${t.accuracy}%`).join(', ')}
    Strong Topics: ${strongTopics.map(t => `${t.topic} (${t.subject}) - ${t.accuracy}%`).join(', ')}
    
    Recommendations: ${recommendations.map(r => r.title).join(', ')}
    
    Provide a study plan in JSON format:
    {
      "immediate": ["tasks for next 1-2 days"],
      "shortTerm": ["tasks for next 1-2 weeks"], 
      "longTerm": ["tasks for next 1-2 months"]
    }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      return {
        immediate: [],
        shortTerm: [],
        longTerm: []
      };
    } catch (error) {
      console.error('Error generating study plan:', error);
      return {
        immediate: [],
        shortTerm: [],
        longTerm: []
      };
    }
  }

  /**
   * Main method to generate detailed AI analysis
   */
  async generateDetailedAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<DetailedAIAnalysis> {
    try {
      // Analyze topic-wise performance
      const topicAnalysis = await this.analyzeTopicPerformance(testAttempt, test);
      
      // Generate AI recommendations
      const recommendations = await this.generateAIRecommendations(testAttempt, topicAnalysis);
      
      // Generate study plan
      const studyPlan = await this.generateStudyPlan(topicAnalysis, recommendations);
      
      // Analyze conceptual insights
      const conceptualInsights = this.analyzeConceptualInsights(topicAnalysis);
      
      // Analyze time management
      const timeManagementAnalysis = this.analyzeTimeManagement(testAttempt);
      
      return {
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
    } catch (error) {
      console.error('Error generating detailed analysis:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  // Helper methods
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
    // In a real implementation, you'd compare against historical data
    return Math.min(95, Math.max(5, scorePercent + Math.random() * 10 - 5));
  }

  private analyzeConceptualInsights(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['conceptualInsights'] {
    const masteredConcepts = topicAnalysis
      .filter(t => t.accuracy >= 85)
      .map(t => t.topic);
    
    const strugglingConcepts = topicAnalysis
      .filter(t => t.accuracy < 60)
      .map(t => t.topic);
    
    // Simple concept connections (in a real implementation, this would be more sophisticated)
    const conceptConnections = [
      "Strong performance in Mechanics suggests good foundation for Thermodynamics",
      "Algebra skills directly impact Calculus performance",
      "Organic Chemistry concepts build upon Inorganic Chemistry basics"
    ];
    
    return {
      masteredConcepts,
      strugglingConcepts,
      conceptConnections
    };
  }

  private analyzeTimeManagement(testAttempt: TestAttemptDocument): DetailedAIAnalysis['timeManagementAnalysis'] {
    const avgTimePerQuestion = testAttempt.totalTimeTaken / testAttempt.totalQuestions;
    const idealTimePerQuestion = 90; // seconds, can be configurable
    
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

export default new AIAnalysisService();
