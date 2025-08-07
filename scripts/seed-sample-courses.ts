#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  mentorContent, 
  courses, 
  courseModules, 
  courseSections, 
  sectionContentItems,
  courseCategories,
  courseCategoryRelations,
  mentors
} from '@/lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seedSampleCourses() {
  console.log('🌱 Seeding sample courses...');

  try {
    // First, let's get a mentor ID (assuming at least one mentor exists)
    const existingMentors = await db.select().from(mentors).limit(1);
    
    if (existingMentors.length === 0) {
      console.log('❌ No mentors found. Please create a mentor first.');
      return;
    }

    const mentorId = existingMentors[0].id;
    console.log('👨‍🏫 Using mentor ID:', mentorId);

    // Create sample course content
    const sampleCourses = [
      {
        title: "Complete Web Development Bootcamp",
        description: "Learn full-stack web development from scratch. Build real projects with HTML, CSS, JavaScript, React, Node.js, and databases.",
        difficulty: "BEGINNER",
        duration: 2400, // 40 hours in minutes
        price: "99.99",
        category: "Web Development",
        tags: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Full Stack"],
        prerequisites: ["Basic computer skills", "No programming experience required"],
        learningOutcomes: [
          "Build responsive websites with HTML, CSS, and JavaScript",
          "Create interactive web applications with React",
          "Develop backend APIs with Node.js and Express",
          "Work with databases (MongoDB and SQL)",
          "Deploy applications to the cloud",
          "Understand modern web development workflow"
        ]
      },
      {
        title: "Python for Data Science",
        description: "Master Python programming for data analysis, visualization, and machine learning. Perfect for beginners and analysts.",
        difficulty: "INTERMEDIATE",
        duration: 1800, // 30 hours
        price: "79.99",
        category: "Data Science",
        tags: ["Python", "Data Analysis", "Machine Learning", "Pandas", "NumPy"],
        prerequisites: ["Basic programming knowledge helpful but not required"],
        learningOutcomes: [
          "Master Python programming fundamentals",
          "Analyze data with Pandas and NumPy",
          "Create visualizations with Matplotlib and Seaborn",
          "Build machine learning models with Scikit-learn",
          "Work with real-world datasets",
          "Deploy data science projects"
        ]
      },
      {
        title: "Advanced React Patterns",
        description: "Deep dive into advanced React concepts, patterns, and performance optimization techniques for experienced developers.",
        difficulty: "ADVANCED",
        duration: 1200, // 20 hours
        price: "129.99",
        category: "Programming",
        tags: ["React", "JavaScript", "Performance", "Patterns", "Advanced"],
        prerequisites: ["Solid React experience", "JavaScript ES6+ knowledge", "Understanding of React hooks"],
        learningOutcomes: [
          "Master advanced React patterns and techniques",
          "Optimize React application performance",
          "Implement complex state management solutions",
          "Build reusable component libraries",
          "Handle advanced routing and authentication",
          "Deploy production-ready React applications"
        ]
      },
      {
        title: "UI/UX Design Fundamentals",
        description: "Learn the principles of user interface and user experience design. Create beautiful, functional designs that users love.",
        difficulty: "BEGINNER",
        duration: 1500, // 25 hours
        price: "0", // Free course
        category: "Design",
        tags: ["UI Design", "UX Design", "Figma", "Prototyping", "User Research"],
        prerequisites: ["Creative mindset", "Basic computer skills"],
        learningOutcomes: [
          "Understand UI/UX design principles",
          "Create wireframes and prototypes",
          "Master design tools like Figma",
          "Conduct user research and testing",
          "Design responsive interfaces",
          "Build a professional design portfolio"
        ]
      }
    ];

    for (const courseData of sampleCourses) {
      console.log(`📚 Creating course: ${courseData.title}`);

      // Create mentor content
      const [mentorContentRecord] = await db.insert(mentorContent).values({
        mentorId,
        title: courseData.title,
        description: courseData.description,
        type: 'COURSE',
        status: 'PUBLISHED'
      }).returning();

      // Create course
      const [courseRecord] = await db.insert(courses).values({
        contentId: mentorContentRecord.id,
        difficulty: courseData.difficulty as any,
        duration: courseData.duration,
        price: courseData.price,
        currency: 'USD',
        category: courseData.category,
        tags: JSON.stringify(courseData.tags),
        prerequisites: JSON.stringify(courseData.prerequisites),
        learningOutcomes: JSON.stringify(courseData.learningOutcomes),
        enrollmentCount: Math.floor(Math.random() * 1000) + 50
      }).returning();

      // Create sample modules for each course
      const modules = [
        { title: "Getting Started", description: "Introduction and setup" },
        { title: "Core Concepts", description: "Fundamental concepts and theory" },
        { title: "Practical Application", description: "Hands-on projects and exercises" },
        { title: "Advanced Topics", description: "Advanced techniques and best practices" }
      ];

      for (let i = 0; i < modules.length; i++) {
        const moduleData = modules[i];
        
        const [moduleRecord] = await db.insert(courseModules).values({
          courseId: courseRecord.id,
          title: moduleData.title,
          description: moduleData.description,
          orderIndex: i,
          learningObjectives: JSON.stringify([
            `Understand ${moduleData.title.toLowerCase()}`,
            `Apply concepts in real projects`,
            `Master key techniques`
          ]),
          estimatedDurationMinutes: Math.floor(courseData.duration / 4)
        }).returning();

        // Create sections for each module
        const sections = [
          { title: "Introduction", description: "Overview of the module" },
          { title: "Core Lessons", description: "Main learning content" },
          { title: "Practice", description: "Exercises and practice" }
        ];

        for (let j = 0; j < sections.length; j++) {
          const sectionData = sections[j];
          
          const [sectionRecord] = await db.insert(courseSections).values({
            moduleId: moduleRecord.id,
            title: sectionData.title,
            description: sectionData.description,
            orderIndex: j
          }).returning();

          // Create content items for each section
          const contentItems = [
            { 
              title: `${sectionData.title} Video`, 
              type: 'VIDEO', 
              duration: 600,
              isPreview: i === 0 && j === 0 // First item is preview
            },
            { 
              title: `${sectionData.title} Reading`, 
              type: 'PDF', 
              duration: 300,
              isPreview: false
            },
            { 
              title: `${sectionData.title} Exercise`, 
              type: 'TEXT', 
              duration: 900,
              isPreview: false
            }
          ];

          for (let k = 0; k < contentItems.length; k++) {
            const itemData = contentItems[k];
            
            await db.insert(sectionContentItems).values({
              sectionId: sectionRecord.id,
              title: itemData.title,
              description: `${itemData.title} content`,
              type: itemData.type as any,
              orderIndex: k,
              duration: itemData.duration,
              isPreview: itemData.isPreview,
              content: itemData.type === 'TEXT' ? 'Sample lesson content...' : null,
              fileUrl: itemData.type === 'VIDEO' ? 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4' : null
            });
          }
        }
      }

      console.log(`✅ Course "${courseData.title}" created successfully`);
    }

    console.log('🎉 Sample courses seeded successfully!');
    console.log('🌐 Visit http://localhost:3000/courses to see them');

  } catch (error) {
    console.error('❌ Error seeding courses:', error);
  } finally {
    await client.end();
  }
}

// Run the script
seedSampleCourses()
  .then(() => {
    console.log('✨ Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });