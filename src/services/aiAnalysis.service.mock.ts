import { TestAttemptDocument, AttemptedQuestion, SubjectAnalytics } from '../models/testAttempt.model';
import { TestDocument, Question } from '../models/test.model';

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

class MockAIAnalysisService {
  /**
   * Generate mock detailed analysis for testing
   */
  async generateDetailedAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): Promise<DetailedAIAnalysis> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock topic analysis based on actual test data
      const topicAnalysis = this.generateMockTopicAnalysis(testAttempt, test);
      
      // Generate mock recommendations
      const recommendations = this.generateMockRecommendations(testAttempt, topicAnalysis);
      
      // Generate mock study plan
      const studyPlan = this.generateMockStudyPlan(topicAnalysis);
      
      // Generate mock conceptual insights
      const conceptualInsights = this.generateMockConceptualInsights(topicAnalysis);
      
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

  private generateMockTopicAnalysis(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ): TopicAnalysis[] {
    const topicAnalysis: TopicAnalysis[] = [];
    
    // Mock topics for each subject
    const mockTopics = {
      'Physics': ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Modern Physics'],
      'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry'],
      'Mathematics': ['Calculus', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
      'Math': ['Calculus', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics']
    };

    // Generate analysis for each subject in the test
    test.sections.forEach((section, sectionIndex) => {
      const subjectTopics = mockTopics[section.subject] || ['General Topics'];
      const questionsPerTopic = Math.ceil(section.questions.length / subjectTopics.length);
      
      subjectTopics.forEach((topic, topicIndex) => {
        const startIndex = topicIndex * questionsPerTopic;
        const endIndex = Math.min(startIndex + questionsPerTopic, section.questions.length);
        
        // Find attempted questions for this topic
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          aq => aq.sectionIndex === sectionIndex &&
                aq.questionIndex >= startIndex &&
                aq.questionIndex < endIndex
        );
        
        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(q => q.isCorrect).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;
          const averageTime = topicQuestions.reduce((sum, q) => sum + q.timeTaken, 0) / topicQuestions.length;
          
          // Get average difficulty
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
    });
    
    return topicAnalysis;
  }

  private generateMockRecommendations(
    testAttempt: TestAttemptDocument,
    topicAnalysis: TopicAnalysis[]
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // Weakness recommendations
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    weakTopics.forEach(topic => {
      recommendations.push({
        type: 'weakness',
        subject: topic.subject,
        topic: topic.topic,
        title: `Improve ${topic.topic} Performance`,
        description: `Your accuracy in ${topic.topic} is ${topic.accuracy.toFixed(1)}%, which needs improvement. Focus on understanding fundamental concepts and practice more problems.`,
        actionItems: [
          `Review ${topic.topic} theory and formulas`,
          `Solve 10-15 practice problems daily`,
          `Watch educational videos on ${topic.topic}`,
          'Take notes on key concepts and formulas'
        ],
        priority: topic.accuracy < 40 ? 'High' : 'Medium'
      });
    });

    // Strength recommendations
    const strongTopics = topicAnalysis.filter(t => t.accuracy >= 80);
    if (strongTopics.length > 0) {
      const bestTopic = strongTopics.reduce((prev, current) => 
        prev.accuracy > current.accuracy ? prev : current
      );
      
      recommendations.push({
        type: 'strength',
        subject: bestTopic.subject,
        topic: bestTopic.topic,
        title: `Maintain Excellence in ${bestTopic.topic}`,
        description: `You're performing excellently in ${bestTopic.topic} with ${bestTopic.accuracy.toFixed(1)}% accuracy. Keep up the good work and tackle advanced problems.`,
        actionItems: [
          'Solve advanced level problems',
          'Help peers with this topic',
          'Explore real-world applications',
          'Take on challenging practice tests'
        ],
        priority: 'Low'
      });
    }

    // Time management recommendations
    const avgTimePerQuestion = testAttempt.totalTimeTaken / testAttempt.totalQuestions;
    if (avgTimePerQuestion > 120) { // More than 2 minutes per question
      recommendations.push({
        type: 'time_management',
        title: 'Improve Time Management',
        description: 'You\'re spending too much time per question. Work on solving problems more efficiently.',
        actionItems: [
          'Practice solving problems under time pressure',
          'Learn quick calculation techniques',
          'Skip difficult questions initially and return later',
          'Use elimination method for multiple choice questions'
        ],
        priority: 'High'
      });
    }

    // Strategy recommendations
    if (testAttempt.changedAnswersCount > testAttempt.totalQuestions * 0.3) {
      recommendations.push({
        type: 'strategy',
        title: 'Reduce Answer Changes',
        description: 'You changed your answers frequently. Trust your first instinct more often.',
        actionItems: [
          'Read questions more carefully the first time',
          'Only change answers if you\'re confident',
          'Practice building confidence in your responses',
          'Review common mistake patterns'
        ],
        priority: 'Medium'
      });
    }

    return recommendations;
  }

  private generateMockStudyPlan(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['studyPlan'] {
    const weakTopics = topicAnalysis.filter(t => t.accuracy < 60);
    const averageTopics = topicAnalysis.filter(t => t.accuracy >= 60 && t.accuracy < 80);
    
    return {
      immediate: [
        'Review today\'s test mistakes and understand correct solutions',
        weakTopics.length > 0 ? `Focus on ${weakTopics[0].topic} fundamentals` : 'Review basic concepts',
        'Practice 5 problems from weakest topic',
        'Create summary notes of key formulas'
      ],
      shortTerm: [
        'Complete practice sets for weak topics',
        'Take 2-3 topic-wise tests weekly',
        averageTopics.length > 0 ? `Strengthen ${averageTopics[0].topic} concepts` : 'Work on moderate difficulty problems',
        'Join study groups or online forums for doubt clearing',
        'Maintain a daily study schedule of 2-3 hours'
      ],
      longTerm: [
        'Take full-length mock tests weekly',
        'Complete comprehensive revision of all topics',
        'Focus on advanced problem-solving techniques',
        'Develop exam-specific strategies and time management',
        'Track progress through regular assessments'
      ]
    };
  }

  private generateMockConceptualInsights(topicAnalysis: TopicAnalysis[]): DetailedAIAnalysis['conceptualInsights'] {
    const masteredConcepts = topicAnalysis
      .filter(t => t.accuracy >= 85)
      .map(t => t.topic);
    
    const strugglingConcepts = topicAnalysis
      .filter(t => t.accuracy < 60)
      .map(t => t.topic);
    
    const conceptConnections = [
      'Strong performance in Mechanics provides a good foundation for Thermodynamics',
      'Algebra skills directly impact your Calculus performance',
      'Understanding Atomic Structure helps with Chemical Bonding concepts',
      'Trigonometry knowledge is essential for solving Physics problems',
      'Organic Chemistry reactions build upon Inorganic Chemistry basics'
    ];
    
    return {
      masteredConcepts,
      strugglingConcepts,
      conceptConnections: conceptConnections.slice(0, 3) // Return first 3 connections
    };
  }

  private generateMockTimeManagementAnalysis(testAttempt: TestAttemptDocument): DetailedAIAnalysis['timeManagementAnalysis'] {
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
      recommendations.push('Avoid rushing through easy questions');
    } else if (pacing === 'Too Slow') {
      recommendations.push('Practice solving questions under time pressure');
      recommendations.push('Learn to quickly eliminate wrong options');
      recommendations.push('Skip difficult questions initially and return later');
    } else {
      recommendations.push('Maintain your current pacing strategy');
      recommendations.push('Continue practicing to improve accuracy');
    }
    
    return {
      efficiency,
      pacing,
      recommendations
    };
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

  private calculateMockPercentile(scorePercent: number): number {
    // Mock percentile calculation
    return Math.min(95, Math.max(5, scorePercent + Math.random() * 10 - 5));
  }
}

export default new MockAIAnalysisService();
