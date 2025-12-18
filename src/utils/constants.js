module.exports = {
    DISPLAY_NAME_PREFIX: 'Fluxx_',
    
    BAN_THRESHOLDS: {
      REPORTS_24H: 3,
      TOTAL_REPORTS: 5
    },
    
    BAN_DURATION: {
      TEMPORARY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      PERMANENT: null
    },
    
    REPORT_REASONS: {
      INAPPROPRIATE_CONTENT: 'inappropriate_content',
      HARASSMENT: 'harassment',
      NUDITY: 'nudity',
      SPAM: 'spam',
      OTHER: 'other'
    },
    
    QUEUE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    
    JWT_EXPIRY: '7d',
    
    UNIVERSITY_EMAIL_DOMAINS: [
      // Add university domains here
      'student.babcock.edu.ng',
      'student.university.edu',
      'uni.edu',
      // For testing, you can add any domain
    ]
  };