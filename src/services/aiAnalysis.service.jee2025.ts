import OpenAI from "openai";
import {
  JEE_SYLLABUS_2025,
  getTopicFromSyllabus,
} from "../config/jee-syllabus-2025";
import { TestAttemptDocument } from "../models/testAttempt.model";
import { TestDocument, Question } from "../models/test.model";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JEETopicAnalysis {
  unit: string;
  topic: string;
  subject: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  syllabusAlignment: "High" | "Medium" | "Low";
  recommendedStudyTime: number; // hours
}

class JEE2025AIAnalysisService {
  async extractJEETopics(
    questions: Question[],
    subject: string
  ): Promise<{ [questionIndex: number]: string }> {
    const syllabusTopics = this.getSyllabusTopics(subject);

    const prompt = `
    Analyze each ${subject} question and map to JEE Main 2025 syllabus topics.
    
    Available topics for ${subject}:
    ${syllabusTopics.join(", ")}
    
    Questions:
    ${questions.map((q, i) => `${i}: ${q.questionText}`).join("\n")}
    
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
      console.error("AI topic extraction failed:", error);
      return this.fallbackTopicMapping(questions, subject);
    }
  }

  private getSyllabusTopics(subject: string): string[] {
    const syllabusData =
      JEE_SYLLABUS_2025[
        subject.toUpperCase() as keyof typeof JEE_SYLLABUS_2025
      ];
    if (!syllabusData) return [];

    return Object.values(syllabusData).flatMap((unit) => unit.topics);
  }

  private fallbackTopicMapping(
    questions: Question[],
    subject: string
  ): { [questionIndex: number]: string } {
    const result: { [questionIndex: number]: string } = {};

    questions.forEach((question, index) => {
      result[index] = getTopicFromSyllabus(question.questionText, subject);
    });

    return result;
  }

  async generateJEERecommendations(
    topicAnalysis: JEETopicAnalysis[]
  ): Promise<any[]> {
    const weakTopics = topicAnalysis.filter((t) => t.accuracy < 60);

    const prompt = `
    Generate JEE Main 2025 specific study recommendations for weak topics:
    ${weakTopics
      .map((t) => `${t.topic} (${t.subject}) - ${t.accuracy}% accuracy`)
      .join("\n")}
    
    Provide JEE-specific study strategies, recommended books, and practice methods.
    Focus on JEE Main exam pattern and difficulty level.
    
    Return JSON array of recommendations.
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
        return JSON.parse(content);
      }
      return this.generateFallbackJEERecommendations(weakTopics);
    } catch (error) {
      return this.generateFallbackJEERecommendations(weakTopics);
    }
  }

  private generateFallbackJEERecommendations(weakTopics: JEETopicAnalysis[]) {
    return weakTopics.map((topic) => ({
      type: "weakness",
      subject: topic.subject,
      topic: topic.topic,
      title: `Master ${topic.topic} for JEE Main`,
      description: `Focus on ${topic.topic} - a key JEE Main topic with ${topic.accuracy}% accuracy`,
      actionItems: [
        `Study ${topic.topic} from NCERT textbook`,
        `Solve previous year JEE Main questions on ${topic.topic}`,
        `Practice mock tests focusing on ${topic.topic}`,
        `Review concepts daily for ${topic.recommendedStudyTime} hours`,
      ],
      priority: topic.accuracy < 40 ? "High" : "Medium",
      examRelevance: "JEE Main 2025",
      estimatedStudyTime: `${topic.recommendedStudyTime} hours/week`,
    }));
  }

  async analyzeJEEPerformance(
    testAttempt: TestAttemptDocument,
    test: TestDocument
  ) {
    const topicAnalysis: JEETopicAnalysis[] = [];

    for (const section of test.sections) {
      const questionTopicMap = await this.extractJEETopics(
        section.questions,
        section.subject
      );

      // Group by topic and analyze
      const topicGroups: { [topic: string]: number[] } = {};
      Object.entries(questionTopicMap).forEach(([qIndex, topic]) => {
        if (!topicGroups[topic]) topicGroups[topic] = [];
        topicGroups[topic].push(parseInt(qIndex));
      });

      Object.entries(topicGroups).forEach(([topic, questionIndices]) => {
        const sectionIndex = test.sections.indexOf(section);
        const topicQuestions = testAttempt.attemptedQuestions.filter(
          (aq) =>
            aq.sectionIndex === sectionIndex &&
            questionIndices.includes(aq.questionIndex)
        );

        if (topicQuestions.length > 0) {
          const correctAnswers = topicQuestions.filter(
            (q) => q.isCorrect
          ).length;
          const accuracy = (correctAnswers / topicQuestions.length) * 100;

          topicAnalysis.push({
            unit: this.getUnitForTopic(topic, section.subject),
            topic,
            subject: section.subject,
            questionsAttempted: topicQuestions.length,
            correctAnswers,
            accuracy,
            syllabusAlignment: this.getSyllabusAlignment(
              topic,
              section.subject
            ),
            recommendedStudyTime: this.calculateStudyTime(
              accuracy,
              topicQuestions.length
            ),
          });
        }
      });
    }

    const recommendations = await this.generateJEERecommendations(
      topicAnalysis
    );

    return {
      topicAnalysis,
      recommendations,
      examSpecific: {
        examType: "JEE Main 2025",
        syllabusCompliance: this.calculateSyllabusCompliance(topicAnalysis),
        priorityTopics: topicAnalysis
          .filter((t) => t.accuracy < 50)
          .map((t) => t.topic),
      },
    };
  }

  private getUnitForTopic(topic: string, subject: string): string {
    const syllabusData =
      JEE_SYLLABUS_2025[
        subject.toUpperCase() as keyof typeof JEE_SYLLABUS_2025
      ];
    if (!syllabusData) return "Unknown Unit";

    for (const [unitKey, unitData] of Object.entries(syllabusData)) {
      if (unitData.topics.includes(topic)) {
        return unitData.name;
      }
    }
    return "Unknown Unit";
  }

  private getSyllabusAlignment(
    topic: string,
    subject: string
  ): "High" | "Medium" | "Low" {
    const syllabusTopics = this.getSyllabusTopics(subject);
    return syllabusTopics.includes(topic) ? "High" : "Low";
  }

  private calculateStudyTime(accuracy: number, questionCount: number): number {
    if (accuracy < 30) return 8; // 8 hours/week
    if (accuracy < 60) return 5; // 5 hours/week
    if (accuracy < 80) return 3; // 3 hours/week
    return 1; // 1 hour/week for maintenance
  }

  private calculateSyllabusCompliance(
    topicAnalysis: JEETopicAnalysis[]
  ): number {
    const highAlignment = topicAnalysis.filter(
      (t) => t.syllabusAlignment === "High"
    ).length;
    return (highAlignment / topicAnalysis.length) * 100;
  }
}

export default new JEE2025AIAnalysisService();
