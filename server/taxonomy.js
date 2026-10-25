// Canonical skill taxonomy with synonyms. Every canonical skill maps to the
// alternate spellings we accept as the same technology. Matching is done with
// word boundaries so "Java" never matches "JavaScript".

export const SKILL_TAXONOMY = {
  'Core Java': ['java', 'core java', 'java 17', 'java 8', 'java 11', 'j2se'],
  'Spring Boot': ['spring boot', 'springboot', 'spring framework', 'spring mvc', 'spring'],
  'Spring Data JPA': ['spring data jpa', 'jpa', 'spring data'],
  Hibernate: ['hibernate', 'orm'],
  'REST APIs': ['rest', 'restful', 'rest api', 'web api', 'api development', 'openapi', 'swagger'],
  MySQL: ['mysql', 'mariadb'],
  PostgreSQL: ['postgres', 'postgresql'],
  MongoDB: ['mongodb', 'mongo'],
  SQL: ['sql', 'structured query language', 'sql queries', 'joins'],
  JavaScript: ['javascript', 'es6', 'ecmascript', 'vanilla js'],
  TypeScript: ['typescript', 'ts'],
  React: ['react', 'reactjs', 'react.js', 'react 18', 'react 19'],
  'React Router': ['react router', 'reactrouter'],
  Redux: ['redux', 'redux toolkit', 'rtk'],
  'Next.js': ['next.js', 'nextjs', 'next js'],
  'Node.js': ['node.js', 'nodejs', 'node js', 'express.js', 'expressjs', 'express'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3'],
  'Bootstrap': ['bootstrap', 'bootstrap 5'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
  Axios: ['axios', 'fetch api'],
  Maven: ['maven', 'pom.xml'],
  Gradle: ['gradle'],
  Git: ['git', 'gitflow'],
  GitHub: ['github', 'gitlab', 'bitbucket'],
  AWS: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation', 'aws cloud practitioner'],
  Docker: ['docker', 'containers', 'containerization'],
  Kubernetes: ['kubernetes', 'k8s'],
  'CI/CD': ['ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'continuous integration', 'continuous deployment'],
  Python: ['python', 'python3', 'py'],
  Django: ['django'],
  Flask: ['flask', 'fastapi'],
  'C': ['c language', 'c programming'],
  'C++': ['c++', 'cpp'],
  'Data Structures': ['data structures', 'dsa', 'databases and algorithms', 'algorithms', 'data structures & algorithms', 'data structures and algorithms'],
  'OOP': ['object oriented', 'oop', 'object oriented programming', 'oops'],
  DBMS: ['dbms', 'rdbms', 'relational database', 'database management'],
  Postman: ['postman', 'api testing tool'],
  Linux: ['linux', 'ubuntu', 'bash', 'shell scripting'],
  Kafka: ['kafka', 'event streaming'],
  Redis: ['redis', 'caching layer'],
  GraphQL: ['graphql', 'apollo'],
  Microservices: ['microservices', 'micro services', 'microservice architecture'],
  Testing: ['junit', 'mockito', 'unit testing', 'integration testing', 'pytest', 'selenium', 'automation testing'],
  Agile: ['agile', 'scrum', 'sprint', 'kanban'],
  'Power BI': ['power bi', 'powerbi'],
  Excel: ['excel', 'advanced excel', 'spreadsheets'],
  'Prompt Engineering': ['prompt engineering', 'llm', 'genai', 'generative ai', 'chatgpt api']
};

// Role families the classifier can assign. Each family carries signals found
// in titles and job descriptions. Title hits count triple versus body hits.
export const ROLE_FAMILIES = {
  backend: {
    label: 'Backend Engineering',
    adjacent: ['fullstack', 'database', 'cloud'],
    signals: ['backend', 'back end', 'server side', 'spring boot', 'java developer', 'java engineer', 'node developer', 'api developer', 'sde', 'software engineer', 'software developer', 'python developer', 'dotnet', '.net developer', 'php developer']
  },
  fullstack: {
    label: 'Full Stack Development',
    adjacent: ['backend', 'frontend'],
    signals: ['full stack', 'fullstack', 'mern', 'mean stack', 'web developer']
  },
  frontend: {
    label: 'Frontend Development',
    adjacent: ['fullstack'],
    signals: ['frontend', 'front end', 'ui developer', 'ui engineer', 'react developer', 'angular developer', 'vue developer', 'web designer']
  },
  mobile: {
    label: 'Mobile Development',
    adjacent: ['frontend', 'backend'],
    signals: ['android', 'ios', 'flutter', 'react native', 'mobile developer', 'app developer']
  },
  qa: {
    label: 'QA / SDET',
    adjacent: ['backend', 'automation'],
    signals: ['qa engineer', 'quality assurance', 'sdet', 'test engineer', 'automation tester', 'manual tester', 'quality analyst engineer', 'testing engineer']
  },
  data: {
    label: 'Data Engineering / Analytics',
    adjacent: ['backend', 'ml'],
    signals: ['data engineer', 'data analyst', 'analytics engineer', 'bi developer', 'etl developer', 'business intelligence developer', 'data science']
  },
  ml: {
    label: 'ML / AI Engineering',
    adjacent: ['data', 'backend'],
    signals: ['machine learning', 'ml engineer', 'ai engineer', 'deep learning', 'nlp engineer', 'computer vision']
  },
  cloud: {
    label: 'Cloud / DevOps / SRE',
    adjacent: ['backend', 'automation'],
    signals: ['devops', 'sre', 'site reliability', 'cloud engineer', 'platform engineer', 'infrastructure engineer', 'system administrator', 'sysadmin']
  },
  security: {
    label: 'Cybersecurity',
    adjacent: ['cloud', 'network'],
    signals: ['security engineer', 'cyber security', 'cybersecurity', 'soc analyst', 'penetration tester', 'application security']
  },
  database: {
    label: 'Database Engineering',
    adjacent: ['backend'],
    signals: ['database engineer', 'dba', 'database administrator', 'sql developer']
  },
  embedded: {
    label: 'Embedded Engineering',
    adjacent: ['backend'],
    signals: ['embedded engineer', 'embedded developer', 'embedded c', 'firmware engineer', 'iot engineer']
  },
  techsupport: {
    label: 'Technical Support Engineering',
    adjacent: ['cloud'],
    signals: ['technical support engineer', 'product support engineer', 'application support engineer', 'it support engineer', 'desktop support engineer']
  }
};

// Nontech work we must exclude. A sales role at a software company never
// qualifies just because the employer builds software.
export const NEGATIVE_FAMILIES = {
  sales: {
    label: 'Sales / Business Development',
    signals: ['business development', 'bda', 'sales executive', 'sales officer', 'telecalling', 'telecaller', 'field sales', 'inside sales', 'sales manager', 'area sales', 'regional sales', 'customer acquisition', 'lead generation', 'pre sales consultant', 'presales', 'insurance advisor', 'relationship officer', 'loan officer', 'collection executive', 'channel sales', 'territory sales', 'sales trainee']
  },
  nontechRecruit: {
    label: 'Recruitment / HR',
    signals: ['hr executive', 'hr recruiter', 'technical recruiter', 'talent acquisition', 'recruiter', 'hr coordinator', 'human resources executive', 'campus recruiter', 'sourcing specialist']
  },
  backoffice: {
    label: 'Back Office / Data Entry',
    signals: ['data entry operator', 'data entry', 'back office executive', 'mis executive', 'documentation executive', 'back office associate', 'clerk', 'typist', 'form filling']
  },
  marketing: {
    label: 'Marketing / Content',
    signals: ['digital marketing', 'marketing executive', 'seo analyst', 'social media executive', 'content writer', 'graphic designer', 'brand associate', 'telesales', 'telepromotion']
  },
  fieldOps: {
    label: 'Field / Delivery Operations',
    signals: ['delivery boy', 'delivery partner', 'rider', 'driver', 'field executive', 'store keeper', 'warehouse', 'packers', 'receptionist', 'front office executive', 'office boy']
  }
};

// Titles that cannot be classified from the title alone. These go to a review
// lane instead of being silently included or excluded.
export const AMBIGUOUS_TITLES = ['analyst', 'consultant', 'specialist', 'associate', 'executive', 'support executive', 'solutions specialist', 'product specialist', 'operations', 'coordinator', 'trainee', 'graduate engineer', 'engineer', 'developer', 'programmer'];

export function canonicalSkills(text) {
  const original = String(text || '');
  // PDF text often loses spaces between words. Rebuild them at case and
  // digit boundaries so "SpringDataJPA" and "RESTAPIs" still match.
  const splitOriginal = original
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2');
  const candidates = [original.toLowerCase(), splitOriginal.toLowerCase()];
  const found = [];
  for (const [canonical, aliases] of Object.entries(SKILL_TAXONOMY)) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[^a-z0-9+#.])${escaped}(?:es|s)?([^a-z0-9+#.]|$)`, 'i');
      if (candidates.some((c) => pattern.test(c))) {
        found.push(canonical);
        break;
      }
    }
  }
  return found;
}

// Split a job description into a required zone and a preferred zone so
// missing must have skills are measured honestly.
export function splitRequirements(description) {
  const text = String(description || '');
  const lower = text.toLowerCase();
  const preferredMarkers = ['nice to have', 'good to have', 'preferred', 'bonus points', 'plus points', 'would be a plus', 'desirable'];
  let preferredStart = -1;
  for (const marker of preferredMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (preferredStart === -1 || idx < preferredStart)) preferredStart = idx;
  }
  if (preferredStart === -1) return { required: text, preferred: '' };
  return { required: text.slice(0, preferredStart), preferred: text.slice(preferredStart) };
}

export function normalizeCompany(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|inc|technologies|technology|tech|solutions|software|services|labs)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}
