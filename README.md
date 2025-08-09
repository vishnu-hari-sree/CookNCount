<img width="3188" height="1202" alt="frame (3)" src="https://github.com/user-attachments/assets/517ad8e9-ad22-457d-9538-a9e62d137cd7" />


# Cook N Count 🎯


## Basic Details
### Team Name: Void


### Team Members
- Team Lead: Mihikka S - NSS College of Engineering Palakkad
- Member 2: Vishnu M - NSS College of Engineering Palakkad

### Project Description
Level up your cooking with Cook'n'Count, your pixel kitchen assistant! It automatically counts cooker whistles, runs perfect timers, and generates AI-powered recipes when you're out of ideas. Discover your "personality dish" with our fun food horoscope, chill out with retro chiptunes from the music player, and get instant advice from our friendly AI chef, "Kunjuttan."

### The Problem (that doesn't exist)
Ever forgot how many whistles your cooker made while you were busy scrolling memes?
Or maybe you can’t tell if your rice is ready because you were too busy whistling along?
Exactly. We’re here to solve this non-problem for you.

### The Solution (that nobody asked for)
We gave your cooker super-hearing.
Our app listens for whistles, counts them, shows a pixel cooker shaking in excitement, and Kunjuttan tells you whether your chicken curry still needs “one more toot” or not.
Oh, and there’s an alarm — because the rice won’t text you when it’s done.

## Technical Details
### Technologies/Components Used
For Software:
-Languages: HTML, TypeScript, CSS

-Frameworks: React.js (for UI), Vite (for bundling)

-Libraries: Web Audio API (whistle detection), TensorFlow.js (sound classification), GSAP (pixel animations)

-Tools: Figma (pixel UI design), GitHub (version control)


### Implementation
For Software:
# Installation
```js
npm install
```

# Run
```js
npm run dev
```

### Project Documentation
For Software:

# Screenshots (Add at least 3)
![Screenshot1](Add screenshot 1 here with proper name)
*Add caption explaining what this shows*

![Screenshot2](Add screenshot 2 here with proper name)
*Add caption explaining what this shows*

![Screenshot3](Add screenshot 3 here with proper name)
*Add caption explaining what this shows*

# Diagrams
```mermaid
graph TD

%% ==== USER SIDE ====
subgraph "User's Device"
    A[Browser]
    B(Microphone)
end

%% ==== FRONTEND ====
subgraph "Frontend (Netlify)"
    C{React App UI}
    C_WC[Whistle Counter]
    C_T[Timer]
    C_M[Music Player]
    C_R[Recipe Helper]
    C_H[Dish Horoscope]
    C_Chat[Ask Kunjuttan]
end

%% ==== BACKEND ====
subgraph "Backend (Render)"
    D(Node.js Server)
    D_R["/api/ai-recipe"]
    D_H["/api/dish-horoscope"]
end

%% ==== EXTERNAL ====
subgraph "External Services"
    E(Google AI API)
end

%% ==== FLOWS ====
A -->|Interacts with UI| C
B -->|Audio Stream| C_WC

%% Whistle Counter
C --> C_WC
style C_WC fill:#FFD700,stroke:#FF8C00,stroke-width:2px

%% Timer & Music
C --> C_T
C --> C_M
style C_T fill:#00FA9A,stroke:#006400,stroke-width:2px
style C_M fill:#9370DB,stroke:#4B0082,stroke-width:2px

%% Recipe Flow
C -->|Request Recipe| C_R
C_R -->|POST| D_R
D_R -->|Send Prompt| E
E -->|Recipe JSON| D_R
D_R --> C_R
C_R -->|Update UI| C
style C_R fill:#1E90FF,stroke:#00008B,stroke-width:2px

%% Horoscope Flow
C -->|Request Horoscope| C_H
C_H -->|POST| D_H
D_H -->|Send Prompt| E
E -->|Horoscope JSON| D_H
D_H --> C_H
C_H -->|Update UI| C
style C_H fill:#FF6347,stroke:#8B0000,stroke-width:2px

%% Chat Flow
C --> C_Chat
style C_Chat fill:#20B2AA,stroke:#006666,stroke-width:2px
```
For Hardware:

# Schematic & Circuit
![Circuit](Add your circuit diagram here)
*Add caption explaining connections*

![Schematic](Add your schematic diagram here)
*Add caption explaining the schematic*

# Build Photos
![Components](Add photo of your components here)
*List out all components shown*

![Build](Add photos of build process here)
*Explain the build steps*

![Final](Add photo of final product here)
*Explain the final build*

### Project Demo
# Video
[Add your demo video link here]
*Explain what the video demonstrates*

# Additional Demos
[Add any extra demo materials/links]


---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--25-25?link=https%3A%2F%2Fwww.tinkerhub.org%2Fevents%2FQ2Q1TQKX6Q%2FUseless%2520Projects)
