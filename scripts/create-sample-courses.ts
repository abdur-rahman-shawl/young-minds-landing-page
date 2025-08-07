import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  mentorContent, 
  courses, 
  courseModules, 
  courseSections, 
  sectionContentItems,
  mentors,
  users,
  courseCategories
} from '../lib/db/schema/course-enrollment';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function createSampleCourses() {
  try {
    console.log('Creating sample courses...');

    // First, check if we have any mentors
    const existingMentors = await db.select().from(mentors).limit(1);
    if (existingMentors.length === 0) {
      console.log('No mentors found. Creating sample mentor...');
      
      // Create a sample user for the mentor
      const sampleUser = await db.insert(users).values({
        id: 'sample-user-id',
        email: 'mentor@example.com',
        name: 'Dr. Sarah Johnson',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b332c2b8?w=150&h=150&fit=crop&crop=face',
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing().returning();

      // Create mentor
      const sampleMentor = await db.insert(mentors).values({
        id: 'sample-mentor-id',
        userId: 'sample-user-id',
        title: 'Senior Software Engineer & Tech Lead',
        company: 'Google',
        bio: 'With over 10 years of experience in software development, I specialize in full-stack development, system design, and team leadership. I have worked at top tech companies and love sharing knowledge with the next generation of developers.',
        experience: 10,
        location: 'San Francisco, CA',
        timezone: 'America/Los_Angeles',
        hourlyRate: '150.00',
        currency: 'USD',
        availability: JSON.stringify({
          monday: ['09:00', '17:00'],
          tuesday: ['09:00', '17:00'],
          wednesday: ['09:00', '17:00'],
          thursday: ['09:00', '17:00'],
          friday: ['09:00', '17:00']
        }),
        expertise: JSON.stringify(['JavaScript', 'React', 'Node.js', 'System Design', 'Leadership']),
        languages: JSON.stringify(['English']),
        education: JSON.stringify([{
          degree: 'Master of Science in Computer Science',
          institution: 'Stanford University',
          year: '2013'
        }]),
        certifications: JSON.stringify([{
          name: 'AWS Solutions Architect',
          issuer: 'Amazon Web Services',
          year: '2021'
        }]),
        socialLinks: JSON.stringify({
          linkedin: 'https://linkedin.com/in/sarah-johnson',
          github: 'https://github.com/sarah-johnson'
        }),
        isApproved: true,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing().returning();
    }

    // Get or use the first mentor
    const mentor = existingMentors.length > 0 ? existingMentors[0] : 
      await db.select().from(mentors).limit(1).then(m => m[0]);

    // Create sample categories
    const categories = [
      { name: 'Web Development', slug: 'web-development', color: '#3B82F6' },
      { name: 'Data Science', slug: 'data-science', color: '#8B5CF6' },
      { name: 'Mobile Development', slug: 'mobile-development', color: '#10B981' },
      { name: 'DevOps', slug: 'devops', color: '#F59E0B' },
      { name: 'AI & Machine Learning', slug: 'ai-ml', color: '#EF4444' }
    ];

    for (const category of categories) {
      await db.insert(courseCategories).values({
        id: `category-${category.slug}`,
        name: category.name,
        slug: category.slug,
        description: `Learn ${category.name} from industry experts`,
        color: category.color,
        isActive: true,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    }

    // Sample courses data
    const sampleCourses = [
      {
        title: 'Complete Full-Stack Web Development Bootcamp',
        description: 'Master modern web development with React, Node.js, and cloud deployment. Build real-world projects and learn industry best practices.',
        category: 'Web Development',
        difficulty: 'INTERMEDIATE' as const,
        price: '299.00',
        tags: ['React', 'Node.js', 'JavaScript', 'Full-Stack', 'MongoDB'],
        prerequisites: ['Basic HTML/CSS knowledge', 'Basic JavaScript understanding'],
        learningOutcomes: [
          'Build complete full-stack web applications',
          'Master React and modern JavaScript',
          'Create REST APIs with Node.js and Express',
          'Deploy applications to cloud platforms',
          'Implement user authentication and authorization'
        ],
        thumbnailUrl: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=450&fit=crop'
      },
      {
        title: 'Data Science with Python and Machine Learning',
        description: 'Learn data analysis, visualization, and machine learning using Python. Perfect for beginners wanting to enter the data science field.',
        category: 'Data Science',
        difficulty: 'BEGINNER' as const,
        price: '199.00',
        tags: ['Python', 'Machine Learning', 'Data Analysis', 'Pandas', 'Scikit-learn'],
        prerequisites: ['Basic programming knowledge'],
        learningOutcomes: [
          'Analyze data using Python and Pandas',
          'Create beautiful visualizations with Matplotlib and Seaborn',
          'Build machine learning models',
          'Work with real-world datasets',
          'Deploy ML models to production'
        ],
        thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop'
      },
      {
        title: 'React Native Mobile App Development',
        description: 'Build cross-platform mobile apps for iOS and Android using React Native. Learn to create professional mobile applications.',
        category: 'Mobile Development',
        difficulty: 'INTERMEDIATE' as const,
        price: '249.00',
        tags: ['React Native', 'Mobile Development', 'iOS', 'Android', 'JavaScript'],
        prerequisites: ['React knowledge', 'JavaScript fundamentals'],
        learningOutcomes: [
          'Build native mobile apps for iOS and Android',
          'Master React Native navigation',
          'Integrate with device APIs and sensors',
          'Publish apps to App Store and Google Play',
          'Implement push notifications and offline support'
        ],
        thumbnailUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop'
      },
      {
        title: 'AI and Machine Learning Fundamentals',
        description: 'Understand artificial intelligence and machine learning concepts with hands-on projects using Python and popular ML libraries.',
        category: 'AI & Machine Learning',
        difficulty: 'BEGINNER' as const,
        price: '0.00',
        tags: ['AI', 'Machine Learning', 'Python', 'TensorFlow', 'Neural Networks'],
        prerequisites: ['Basic Python knowledge', 'High school mathematics'],
        learningOutcomes: [
          'Understand core AI and ML concepts',
          'Build neural networks from scratch',
          'Use TensorFlow and Keras for deep learning',
          'Work with computer vision and NLP',
          'Deploy AI models to the cloud'
        ],
        thumbnailUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop'
      },
      {
        title: 'DevOps and Cloud Infrastructure Mastery',
        description: 'Learn modern DevOps practices, CI/CD pipelines, containerization with Docker, and cloud deployment on AWS.',
        category: 'DevOps',
        difficulty: 'ADVANCED' as const,
        price: '399.00',
        tags: ['DevOps', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'],
        prerequisites: ['Linux command line experience', 'Basic networking knowledge'],
        learningOutcomes: [
          'Master Docker and Kubernetes',
          'Build robust CI/CD pipelines',
          'Deploy scalable applications on AWS',
          'Implement monitoring and logging',
          'Automate infrastructure with Terraform'
        ],
        thumbnailUrl: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=450&fit=crop'
      }
    ];

    // Create courses
    for (const courseData of sampleCourses) {
      console.log(`Creating course: ${courseData.title}`);

      // Create mentor content
      const contentId = `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(mentorContent).values({
        id: contentId,
        mentorId: mentor.id,
        type: 'COURSE',
        title: courseData.title,
        description: courseData.description,
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create course
      const courseId = `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(courses).values({
        id: courseId,
        contentId: contentId,
        difficulty: courseData.difficulty,
        duration: 3600 * 20, // 20 hours
        price: courseData.price,
        currency: 'USD',
        thumbnailUrl: courseData.thumbnailUrl,
        category: courseData.category,
        tags: JSON.stringify(courseData.tags),
        prerequisites: JSON.stringify(courseData.prerequisites),
        learningOutcomes: JSON.stringify(courseData.learningOutcomes),
        enrollmentCount: Math.floor(Math.random() * 1000) + 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create sample modules for each course
      const modules = [
        {
          title: 'Getting Started',
          description: 'Introduction and setup',
          orderIndex: 0,
          estimatedDurationMinutes: 120
        },
        {
          title: 'Core Concepts',
          description: 'Learn the fundamental concepts',
          orderIndex: 1,
          estimatedDurationMinutes: 300
        },
        {
          title: 'Advanced Topics',
          description: 'Deep dive into advanced features',
          orderIndex: 2,
          estimatedDurationMinutes: 240
        },
        {
          title: 'Real-World Projects',
          description: 'Build actual projects',
          orderIndex: 3,
          estimatedDurationMinutes: 480
        }
      ];

      for (const moduleData of modules) {
        const moduleId = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(courseModules).values({
          id: moduleId,
          courseId: courseId,
          title: moduleData.title,
          description: moduleData.description,
          orderIndex: moduleData.orderIndex,
          learningObjectives: JSON.stringify([
            'Understand key concepts',
            'Apply knowledge practically',
            'Complete hands-on exercises'
          ]),
          estimatedDurationMinutes: moduleData.estimatedDurationMinutes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create sections for each module
        const sections = [
          { title: 'Introduction', description: 'Module overview', orderIndex: 0 },
          { title: 'Theory', description: 'Conceptual understanding', orderIndex: 1 },
          { title: 'Practice', description: 'Hands-on exercises', orderIndex: 2 }
        ];

        for (const sectionData of sections) {
          const sectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await db.insert(courseSections).values({
            id: sectionId,
            moduleId: moduleId,
            title: sectionData.title,
            description: sectionData.description,
            orderIndex: sectionData.orderIndex,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Create content items for each section
          const contentItems = [
            {
              title: 'Welcome Video',
              description: 'Introduction to this section',
              type: 'VIDEO' as const,
              duration: 300,
              isPreview: sectionData.orderIndex === 0,
              fileUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
            },
            {
              title: 'Reading Material',
              description: 'Supplementary reading',
              type: 'PDF' as const,
              duration: 600,
              isPreview: false,
              fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            },
            {
              title: 'External Resource',
              description: 'Additional learning resource',
              type: 'URL' as const,
              duration: 0,
              isPreview: false,
              fileUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
            }
          ];

          for (const itemData of contentItems) {
            await db.insert(sectionContentItems).values({
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sectionId: sectionId,
              title: itemData.title,
              description: itemData.description,
              type: itemData.type,
              duration: itemData.duration,
              isPreview: itemData.isPreview,
              fileUrl: itemData.fileUrl,
              orderIndex: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      console.log(`✅ Created course: ${courseData.title}`);
    }

    console.log('✅ Sample courses created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample courses:', error);
  } finally {
    await sql.end();
  }
}

// Run the script
createSampleCourses();