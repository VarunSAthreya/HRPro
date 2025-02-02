# HRPro

**AI-Driven Talent Acquisition and Onboarding Assistant**

HRPro is an innovative AI-powered assistant designed to revolutionize talent acquisition and employee onboarding. By integrating web scraping, Retrieval-Augmented Generation (RAG), and dynamic prompts, HRPro streamlines the recruitment process, enhances candidate evaluation, and ensures a smooth, personalized onboarding experience for new hires.


<p align="center">
  <a href="https://www.youtube.com/watch?v=40C9LkH4eU8">
    <img src="https://img.youtube.com/vi/40C9LkH4eU8/0.jpg" alt="Watch the video" />
  </a>
</p>


---

## Table of Contents

- [HRPro](#hrpro)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Talent Acquisition Support](#talent-acquisition-support)
    - [Employee Training and Onboarding](#employee-training-and-onboarding)
  - [Project Structure](#project-structure)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running the Applications](#running-the-applications)
    - [Building for Production](#building-for-production)
  - [Contributing](#contributing)
  - [License](#license)

---

## Overview

In today’s competitive job market, efficient talent acquisition and onboarding are crucial for any organization. HRPro leverages advanced AI techniques to:
- Automate the creation and validation of job descriptions.
- Evaluate candidates by scoring their resumes against job requirements.
- Manage candidate communication, from scheduling interviews to sending rejection notifications.
- Provide new hires with personalized onboarding materials and real-time support through dynamic prompts and follow-up questions.

By integrating these capabilities, HRPro not only enhances recruitment efficiency but also accelerates the onboarding process, ensuring that both recruiters and new employees have immediate access to context-aware guidance and internal resources.

For more details about the architecture and features of HRPro, please refer to the [API README](./apps/api/README.md).

---

## Features

### Talent Acquisition Support
- **Automated Job Posting:** Generate job descriptions and post listings across multiple platforms based on initial requirements.
- **Job Description Validation:** Ensure job descriptions align with the necessary technologies and skills.
- **Candidate Scoring:** Evaluate candidates by comparing their resumes with job requirements.
- **Communication Automation:** Automate email notifications for rejected candidates and schedule interviews with selected candidates.

### Employee Training and Onboarding
- **Personalized Onboarding:** Utilize RAG-powered retrieval to provide personalized onboarding materials, FAQs, and internal resources.
- **Dynamic Prompts:** Deliver role-specific, team-tailored prompts that guide new hires through their onboarding journey.
- **AI-Generated Follow-Up:** Generate follow-up questions to ensure thorough understanding and assist employees throughout their training modules.

---

## Project Structure

HRPro is organized as a [Turnorepo](https://turnorepo.org/) monorepo, leveraging TypeScript across its services. The main directories are:

- **Frontend:**
  Located at `./apps/web`
  Contains the web application interface where users can interact with the HRPro assistant.

- **API:**
  Located at `./apps/api`
  Houses the backend services that power the AI functionalities, data processing, and integrations.

---

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/HRPro.git
   cd HRPro
   ```

2. **Install Dependencies:**

   HRPro uses a monorepo structure, so you might need to install dependencies at the root level as well as in each app.

   ```bash
   # Install root-level dependencies
   npm install

   # Install dependencies for the web app
   cd apps/web
   npm install

   # Install dependencies for the API
   cd ../api
   npm install
   ```

3. **Configure Environment Variables:**

   Create a `.env` file in both the `./apps/web` and `./apps/api` directories if required. Refer to the provided `.env.example` files for guidance.

---

## Usage

### Running the Applications

- **Frontend (Web):**

  Navigate to the `apps/web` directory and start the development server:

  ```bash
  cd apps/web
  npm run dev
  ```

- **Backend (API):**

  Navigate to the `apps/api` directory and start the API server:

  ```bash
  cd apps/api
  npm run dev
  ```

### Building for Production

Ensure that all configurations are set for a production environment. Then, build the projects accordingly:

```bash
# Build the API
cd apps/api
npm run build

# Build the Web app
cd ../web
npm run build
```

Deploy your applications using your preferred hosting provider.

---

## Contributing

Contributions to HRPro are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear, descriptive commit messages.
4. Open a pull request detailing your changes.

For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

HRPro is committed to enhancing the efficiency of talent acquisition and onboarding processes through state-of-the-art AI solutions. For any questions or feedback, please open an issue or contact the maintainers directly. Enjoy building with HRPro!
