const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

const app = express();
const PORT = 3000;
const CONTENT_DIR = path.join(__dirname, 'content');

// Cache object to store parsed HTML
const htmlCache = {};

// Helper function to read Markdown and convert to HTML
async function renderMarkdown(filePath) {
    // Check if the file is already in the cache
    if (htmlCache[filePath]) {
        console.log(`Serving from cache: ${filePath}`);
        return htmlCache[filePath];
    }

    try {
        const markdown = await fs.readFile(filePath, 'utf-8');
        const htmlContent = marked.parse(markdown);
        // Store the parsed HTML in the cache
        htmlCache[filePath] = htmlContent;
        console.log(`Caching content for: ${filePath}`);
        return htmlContent;
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        return '<h1>404 - Page Not Found</h1>';
    }
}

// Helper function to get template
async function getTemplate() {
    const templatePath = path.join(__dirname, 'views', 'layout.html');
    return await fs.readFile(templatePath, 'utf-8');
}

// Helper function to inject content into the template
function injectTemplate(content, title) {
    const htmlContent = content || 'Content not found';
    return (template) => template
        .replace('{{{content}}}', htmlContent)
        .replace('{{title}}', title);
}

// Middleware to serve pages based on markdown files
app.get('*', async (req, res) => {
    const requestPath = req.path === '/' ? 'index' : req.path;
    const filePath = path.join(CONTENT_DIR, `${requestPath}.md`);
    const dirFilePath = path.join(CONTENT_DIR, requestPath, 'index.md');

    // Check if the markdown file exists
    const targetFile = await fs.pathExists(filePath) ? filePath : await fs.pathExists(dirFilePath) ? dirFilePath : null;

    if (!targetFile) {
        return res.status(404).send('<h1>404 - Page Not Found</h1>');
    }

    // Read markdown file and render HTML (with caching)
    const markdownContent = await renderMarkdown(targetFile);
    const template = await getTemplate();
    const renderedPage = injectTemplate(markdownContent, requestPath.replace('/', ''))(template);

    res.send(renderedPage);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
