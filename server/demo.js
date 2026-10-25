// Demo mode fixtures. Every employer, job, review, and report in this file is
// synthetic. Names were invented for demonstration. Demo data never mixes
// with real imports and all external submission stays disabled in demo mode.

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();

export const DEMO_CANDIDATE = {
  name: 'Aarav Kulkarni',
  headline: 'Software Developer | Java, Spring Boot, SQL & AWS',
  city: 'Pune',
  email: 'aarav.demo@example.com',
  skills: ['Core Java', 'Spring Boot', 'Spring Data JPA', 'Hibernate', 'REST APIs', 'MySQL', 'SQL', 'React', 'React Router', 'Axios', 'Bootstrap', 'HTML', 'CSS', 'JavaScript', 'AWS', 'Git', 'GitHub', 'Maven', 'Postman', 'OOP', 'DBMS', 'Data Structures'],
  roleFamilies: ['backend', 'fullstack'],
  targetLocations: ['Pune'],
  minCompLPA: null,
  experience: [],
  projects: [
    { name: 'BankNest', blurb: 'full stack banking application with 8+ REST APIs in Spring Boot and a live React dashboard' },
    { name: 'LifeDrop', blurb: 'blood donation management platform with role based dashboards and atomic inventory deduction' }
  ],
  resumeText: 'Synthetic demo candidate resume. Java 17, Spring Boot, Spring Data JPA, Hibernate, MySQL, React, AWS, REST APIs, Maven, layered architecture, transactional transfers, role based dashboards.'
};

export const DEMO_COMPANIES = [
  { id: 'c_punestack', name: 'PuneStack Technologies', domain: 'punestack.demo', careersUrl: 'https://careers.punestack.demo', atsProvider: 'demo', handle: 'demo', locations: ['Pune'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_deccan', name: 'Deccan Digital Bank', domain: 'deccandigital.demo', careersUrl: 'https://careers.deccandigital.demo', atsProvider: 'demo', handle: 'demo', locations: ['Pune'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_cloudkart', name: 'CloudKart', domain: 'cloudkart.demo', careersUrl: 'https://careers.cloudkart.demo', atsProvider: 'demo', handle: 'demo', locations: ['Remote India'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_nammapay', name: 'NammaPay', domain: 'nammapay.demo', careersUrl: 'https://careers.nammapay.demo', atsProvider: 'demo', handle: 'demo', locations: ['Bengaluru'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_zenreach', name: 'ZenReach Systems', domain: 'zenreach.demo', careersUrl: 'https://careers.zenreach.demo', atsProvider: 'demo', handle: 'demo', locations: ['Pune'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_techvardhak', name: 'TechVardhak Software', domain: 'techvardhak.demo', careersUrl: 'https://careers.techvardhak.demo', atsProvider: 'demo', handle: 'demo', locations: ['Pune'], verified: true, note: 'Synthetic employer for demo mode' },
  { id: 'c_kothrud', name: 'Kothrud CloudWorks', domain: 'kothrudcloud.demo', careersUrl: 'https://careers.kothrudcloud.demo', atsProvider: 'demo', handle: 'demo', locations: ['Pune'], verified: true, note: 'Synthetic employer for demo mode' }
];

const JD = (parts) => parts.join('\n\n');

export const DEMO_JOBS = [
  {
    id: 'demo_j1',
    title: 'Java Backend Developer',
    companyRef: 'c_punestack',
    city: 'Pune, Hinjewadi Phase 2',
    workMode: 'Hybrid',
    employmentType: 'Full time',
    postedAt: daysAgo(2),
    deadline: daysAhead(21),
    salary: { known: true, minLPA: 6, maxLPA: 9 },
    description: JD([
      'We are PuneStack, a product engineering studio in Hinjewadi building logistics platforms for Indian manufacturers.',
      'You will work on our shipment orchestration service: designing REST APIs, tuning MySQL queries, and shipping features in two week sprints.',
      'What you need: strong Core Java (Java 17), Spring Boot, Spring Data JPA or Hibernate, MySQL, and REST API design. You understand layered architecture and can explain why a service layer exists. Git and Maven are part of your daily flow.',
      'Nice to have: React exposure for internal dashboards, AWS deployment experience, Docker.',
      'Experience: 0 to 3 years. Freshers with strong project work are welcome. Pay: 6 to 9 LPA based on the interview outcome.',
      'Interview process: 1 machine coding round, 1 system basics discussion, 1 HR round. Two weeks end to end.'
    ])
  },
  {
    id: 'demo_j2',
    title: 'Software Engineer, Backend (0 to 2 years)',
    companyRef: 'c_deccan',
    city: 'Pune, Kharadi',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(1),
    deadline: daysAhead(6),
    salary: { known: true, minLPA: 8, maxLPA: 12 },
    description: JD([
      'Deccan Digital Bank builds core banking experiences for tier two India. Our Kharadi engineering floor owns payments and accounts.',
      'You will join the accounts team writing Spring Boot services with @Transactional integrity for ledger operations, integrating with our MySQL schema and exposing REST APIs consumed by mobile teams.',
      'Required: Java, Spring Boot, SQL, REST APIs, unit testing with JUnit. Understanding of atomicity and consistency in money movement.',
      'Preferred: AWS Cloud Practitioner level cloud familiarity, Kafka curiosity, React for internal tools.',
      'Experience: 0 to 2 years. Compensation: 8 to 12 LPA plus annual variable up to 10 percent.',
      'Process: online assessment, two technical rounds, manager round. Closing applications in one week.'
    ])
  },
  {
    id: 'demo_j3',
    title: 'Backend Engineer, Microservices',
    companyRef: 'c_cloudkart',
    city: 'Remote (India)',
    workMode: 'Remote',
    employmentType: 'Full time',
    postedAt: daysAgo(3),
    deadline: null,
    salary: { known: true, minLPA: 7, maxLPA: 11 },
    description: JD([
      'CloudKart runs a grocery commerce platform used across 40 Indian cities. The team is remote first within India with quarterly meetups.',
      'You will own microservices for cart and pricing, built in Java and Spring Boot with MySQL and Redis, deployed on AWS via Docker containers.',
      'Must have: Java, Spring Boot, REST, MySQL, Redis basics, Git. Comfort with async communication and idempotent APIs.',
      'Nice to have: Kafka, Kubernetes, Terraform.',
      'Experience: 1 to 3 years or exceptional fresher portfolio. Pay: 7 to 11 LPA.',
      'India based remote. Occasional travel to the Pune office for team weeks.'
    ])
  },
  {
    id: 'demo_j4',
    title: 'SDE 1 Backend',
    companyRef: 'c_nammapay',
    city: 'Bengaluru, Koramangala',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(5),
    deadline: daysAhead(15),
    salary: { known: true, minLPA: 10, maxLPA: 14 },
    description: JD([
      'NammaPay is a UPI first fintech in Koramangala. We process statements and reconciliation for 2 million users.',
      'SDE 1 responsibilities: build and operate Spring Boot services, write clean MySQL schemas, participate in on call rotation after 6 months.',
      'Requirements: Core Java, Spring Boot, SQL, data structures fundamentals, REST API experience.',
      'Good to have: AWS, Docker, any payments exposure.',
      'Experience: 0 to 2 years. Compensation: 10 to 14 LPA with variable component up to 15 percent.',
      'This is an onsite role in Bengaluru. Relocation support: one month of serviced accommodation.'
    ])
  },
  {
    id: 'demo_j5',
    title: 'Senior Java Developer',
    companyRef: 'c_zenreach',
    city: 'Pune, Baner',
    workMode: 'Hybrid',
    employmentType: 'Full time',
    postedAt: daysAgo(8),
    deadline: null,
    salary: { known: true, minLPA: 16, maxLPA: 24 },
    description: JD([
      'ZenReach Systems builds telecom billing software. Our Baner office needs a senior Java developer to lead the rating engine team.',
      'You will design high throughput Java services, mentor three engineers, and own schema migrations for a 4 TB MySQL estate.',
      'Required: 4 to 6 years of Core Java and Spring Boot, deep SQL, REST API design at scale, microservices in production.',
      'Experience: 4 to 6 years. Pay: 16 to 24 LPA.'
    ])
  },
  {
    id: 'demo_j6',
    title: 'Sales Executive, Software Products',
    companyRef: 'c_techvardhak',
    city: 'Pune, Shivajinagar',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(1),
    deadline: null,
    salary: { known: true, minLPA: 3.6, maxLPA: 5 },
    description: JD([
      'TechVardhak Software sells inventory management SaaS to MSMEs. We need hungry sales executives for outbound demos and closing.',
      'Your day: cold calling, WhatsApp follow ups, product demos on Zoom, target of 15 demos a week, incentives on every close.',
      'Requirements: excellent communication in English and Marathi, persuasion skills, own two wheeler. Freshers welcome, no coding involved.',
      'Salary 3.6 to 5 LPA plus uncapped incentive.'
    ])
  },
  {
    id: 'demo_j7',
    title: 'Customer Support Executive',
    companyRef: 'c_techvardhak',
    city: 'Pune',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(4),
    deadline: null,
    salary: { known: false, minLPA: null, maxLPA: null },
    description: JD([
      'TechVardhak Software is hiring support executives to assist our SaaS customers over phone and email.',
      'Responsibilities: handle 60 plus tickets a day, log issues in the CRM, escalate to the product team, maintain CSAT above 90 percent.',
      'Requirements: any graduate, clear communication, willingness to work in rotational shifts including night shift.',
      'Walk in interviews all week at our Shivajinagar office.'
    ])
  },
  {
    id: 'demo_j8',
    title: 'Work From Home Data Entry, Daily Payment',
    companyRef: null,
    companyName: 'Hiring Team (WhatsApp)',
    city: 'Remote',
    workMode: 'Remote',
    employmentType: 'Part time',
    postedAt: daysAgo(0),
    deadline: daysAhead(2),
    salary: { known: true, minLPA: null, maxLPA: null },
    description: JD([
      'Earn ₹3000 daily from home! Simple typing work, no skills required, no experience needed.',
      'Just pay a one time registration fee of ₹499 to receive the work portal login. 100% placement guaranteed, limited slots today!',
      'Contact HR Riya on WhatsApp +91 9XXXX 00000 or join our Telegram: t.me/fastjobsdaily',
      'Payment of fee via UPI accepted. Refundable after first salary.'
    ])
  },
  {
    id: 'demo_j9',
    title: 'Frontend Developer, React',
    companyRef: 'c_punestack',
    city: 'Pune, Hinjewadi Phase 2',
    workMode: 'Hybrid',
    employmentType: 'Full time',
    postedAt: daysAgo(3),
    deadline: null,
    salary: { known: true, minLPA: 5, maxLPA: 8 },
    description: JD([
      'PuneStack needs a React developer for our client facing analytics consoles.',
      'You will build responsive dashboards in React with React Router, manage API calls through a centralized Axios layer, and own UI quality across breakpoints.',
      'Must have: React, JavaScript, HTML5, CSS3, REST API integration, Git.',
      'Nice to have: Bootstrap or Tailwind, charting libraries, testing.',
      'Experience: 0 to 2 years. Pay: 5 to 8 LPA.'
    ])
  },
  {
    id: 'demo_j10',
    title: 'QA Engineer (Manual plus Automation)',
    companyRef: 'c_kothrud',
    city: 'Pune, Kothrud',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(6),
    deadline: daysAhead(25),
    salary: { known: true, minLPA: 4.5, maxLPA: 7 },
    description: JD([
      'Kothrud CloudWorks provides managed cloud services and needs a QA engineer for our client delivery teams.',
      'You will write test cases, run regression suites manually, and grow our Selenium automation coverage for web applications.',
      'Required: SQL for data validation, REST API testing with Postman, sharp eye for edge cases, basic Java or Python for automation scripts.',
      'Good to have: Selenium, JUnit, agile ceremony experience.',
      'Experience: 0 to 2 years. Pay: 4.5 to 7 LPA.'
    ])
  },
  {
    id: 'demo_j11',
    title: 'Java Developer (Service Agreement Applies)',
    companyRef: 'c_kothrud',
    city: 'Pune, Kothrud',
    workMode: 'Onsite',
    employmentType: 'Full time',
    postedAt: daysAgo(1),
    deadline: daysAhead(30),
    salary: { known: true, minLPA: 7, maxLPA: 10 },
    description: JD([
      'Kothrud CloudWorks is expanding its platform engineering bench with Java developers for long term client engagements.',
      'Work: Spring Boot REST services, MySQL schema design, deployment support on client AWS accounts.',
      'Required: Core Java, Spring Boot, SQL, REST APIs, Git. 0 to 2 years experience considered for strong candidates.',
      'Important: this position carries a 2 year service agreement with a ₹1,50,000 training cost recovery clause. Read the agreement carefully before joining. Pay: 7 to 10 LPA.'
    ])
  },
  {
    id: 'demo_j12',
    title: 'Data Analyst',
    companyRef: 'c_cloudkart',
    city: 'Remote (India)',
    workMode: 'Remote',
    employmentType: 'Full time',
    postedAt: daysAgo(7),
    deadline: null,
    salary: { known: false, minLPA: null, maxLPA: null },
    description: JD([
      'CloudKart analytics team needs a data analyst to turn commerce events into decisions.',
      'You will build dashboards, write SQL daily, and partner with category managers on pricing experiments.',
      'Requirements: SQL, Excel, one BI tool, statistics basics. Python is a plus.',
      'Experience: 0 to 2 years. Pay undisclosed pending budget approval.'
    ])
  },
  {
    id: 'demo_j13',
    title: 'DevOps Intern',
    companyRef: 'c_deccan',
    city: 'Pune, Kharadi',
    workMode: 'Hybrid',
    employmentType: 'Internship',
    postedAt: daysAgo(2),
    deadline: daysAhead(12),
    salary: { known: true, minLPA: 3, maxLPA: 3.6 },
    description: JD([
      'Six month DevOps internship at Deccan Digital Bank with conversion potential.',
      'You will shadow the platform team: CI/CD pipelines in Jenkins, Docker images, AWS EC2 and S3 housekeeping, monitoring dashboards.',
      'Required: Linux comfort, Git, scripting curiosity, cloud basics.',
      'Stipend: 3 to 3.6 LPA equivalent. Pre placement offer on strong performance.'
    ])
  },
  {
    id: 'demo_j1b',
    title: 'Java Backend Developer',
    companyRef: 'c_punestack',
    city: 'Pune, Hinjewadi Phase 2',
    workMode: 'Hybrid',
    employmentType: 'Full time',
    postedAt: daysAgo(2),
    deadline: daysAhead(21),
    salary: { known: true, minLPA: 6, maxLPA: 9 },
    mirrorOf: 'demo_j1',
    description: 'Mirror listing of the PuneStack Java Backend Developer role as seen on a second job board, kept to prove cross source deduplication.'
  }
];

export const DEMO_INTERVIEW_REPORTS = [
  { companyId: 'c_punestack', role: 'Backend', stages: 'Machine coding on Spring Boot, then a fundamentals chat, then HR. Two weeks end to end.', mode: 'Online plus onsite', reportedBy: 'Synthetic candidate reports for demo', date: daysAgo(20), confidence: 'demo' },
  { companyId: 'c_deccan', role: 'Backend', stages: 'Online assessment with 2 DSA questions, two technical rounds on Java and SQL, manager round.', mode: 'Online', reportedBy: 'Synthetic candidate reports for demo', date: daysAgo(35), confidence: 'demo' }
];

export const DEMO_COMPANY_NOTES = {
  c_punestack: { sector: 'Product engineering studio', engineering: 'Logistics and analytics products, Java and React heavy stack', environment: 'Synthetic demo note: not a real company' },
  c_deccan: { sector: 'Digital banking', engineering: 'Payments and core banking services on Spring Boot', environment: 'Synthetic demo note: not a real company' },
  c_nammapay: { sector: 'Fintech', engineering: 'UPI rails, reconciliation pipelines', environment: 'Synthetic demo note: not a real company' },
  c_cloudkart: { sector: 'Commerce', engineering: 'Microservices on AWS, remote first team', environment: 'Synthetic demo note: not a real company' },
  c_zenreach: { sector: 'Telecom software', engineering: 'High throughput billing systems', environment: 'Synthetic demo note: not a real company' },
  c_techvardhak: { sector: 'SaaS for MSMEs', engineering: 'Small engineering team, sales heavy org', environment: 'Synthetic demo note: not a real company' },
  c_kothrud: { sector: 'Managed cloud services', engineering: 'Client delivery teams, mixed stacks', environment: 'Synthetic demo note: not a real company' }
};

export function buildDemoJobs(candidateName) {
  return DEMO_JOBS.map((j) => {
    const company = DEMO_COMPANIES.find((c) => c.id === j.companyRef);
    return {
      id: j.id,
      externalId: j.id,
      title: j.title,
      company: {
        name: company?.name || j.companyName || 'Unknown employer',
        domain: company?.domain || null,
        verified: !!company,
        atsProvider: company ? 'demo' : null
      },
      city: j.city,
      workMode: j.workMode,
      employmentType: j.employmentType,
      description: j.description,
      requiredSkills: [],
      preferredSkills: [],
      experienceRange: { min: null, max: null, text: null },
      salary: j.salary,
      postedAt: j.postedAt,
      firstSeen: j.postedAt,
      lastSeen: new Date().toISOString(),
      deadline: j.deadline,
      sourceUrls: company ? [company.careersUrl] : [],
      applyUrl: company ? `${company.careersUrl}/apply/${j.id}` : null,
      source: { type: 'demo', id: 'demo' },
      status: 'open',
      bond: j.id === 'demo_j11'
        ? { status: 'employer_confirmed', evidence: [{ text: '2 year service agreement with ₹1,50,000 training cost recovery clause, stated in the official posting', source: 'job description', date: j.postedAt }] }
        : { status: 'no_evidence', evidence: [] },
      scamScore: 0,
      scamFlags: []
    };
  });
}
