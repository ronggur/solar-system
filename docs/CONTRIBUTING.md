# Contributing to 3D Solar System Explorer

Thank you for your interest in contributing! We welcome contributions from everyone.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Git installed and configured
- Familiarity with React and TypeScript
- Basic understanding of Three.js concepts (optional but helpful)

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/solar-system.git
   cd solar-system
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- Follow existing code style and conventions
- Use TypeScript for all new files
- Write meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

### Commit Messages

Follow conventional commits format:

```
<type>: <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat: add Saturn's moons Enceladus and Mimas

- Added moon data for Enceladus with geysers info
- Added moon data for Mimas with Herschel crater
- Updated ObjectList to show new moons

Closes #42
```

```
fix: correct Triton's orbital inclination

- Fixed Triton's retrograde orbit calculation
- Updated moon data with accurate inclination angle

Fixes #15
```

## 🎯 Areas for Contribution

### High Priority

- **Bug Fixes**: Help squash bugs reported in Issues
- **Documentation**: Improve guides and add examples
- **Performance**: Optimize rendering for mobile devices

### Medium Priority

- **New Features**: Implement features from Roadmap
- **UI/UX**: Improve user interface design
- **Accessibility**: Make app more accessible

### Low Priority

- **Code Cleanup**: Refactor and improve code quality
- **Tests**: Add unit and integration tests

## 📦 What to Contribute

### Data

Add new celestial bodies in `src/data/`:
- Planets (if new ones are discovered)
- Moons (natural satellites)
- Satellites (artificial satellites)
- Space probes

### Components

Create new UI/3D components:
- Info panels for new object types
- Visual effects (comets, auroras, etc.)
- Interactive elements

### Documentation

Improve project documentation:
- README.md updates
- Code comments
- API documentation
- Tutorials

### Design

Improve visual appearance:
- Color schemes
- Component styling
- Layout improvements
- Responsive design

## 🧪 Testing

Before submitting a PR:

1. Run development server: `npm run dev`
2. Test all features you modified
3. Test on multiple browsers (Chrome, Firefox, Safari)
4. Check console for errors
5. Run linter: `npm run lint`
6. Build production version: `npm run build`

## 📤 Submitting Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Create Pull Request on GitHub

### Pull Request Checklist

- [ ] Code follows project style
- [ ] Self-reviewed the code
- [ ] Tested thoroughly
- [ ] No console errors
- [ ] Updated documentation
- [ ] Added comments where needed
- [ ] Commit messages are clear

## 🐛 Reporting Issues

When reporting bugs, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: How to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, device
6. **Screenshots**: If applicable

## 💬 Discussion

For questions or suggestions:
- Start a GitHub Discussion
- Be respectful and constructive
- Provide context and details
- Search existing discussions first

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers warmly
- Focus on what is best for the community
- Show empathy towards other community members

## 🙏 Thank You

Every contribution helps make this project better. Thank you for your time and effort!

---

Need help? Contact us or open a discussion!
