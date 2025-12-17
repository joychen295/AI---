const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = [
    "辰极智脑-认证与仪表盘需求说明书_V1.0.md",
    "辰极智脑-知识库管理与构建需求说明书_V1.0.md",
    "辰极智脑-知识库查询需求说明书_V1.0.md",
    "辰极智脑-文档管理需求说明书_V1.0.md",
    "辰极智脑-知识库配置需求说明书_V1.0.md"
];

const workDir = "/Users/joy/工作/辰极/AI 辰极/需求文档/G-中台需求文档";

files.forEach(file => {
    const filePath = path.join(workDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /```mermaid\s*([\s\S]*?)\s*```/g;
    let match;
    let replacements = [];
    let counter = 1;

    // Find all matches first to avoid messing up indices during replacement
    while ((match = regex.exec(content)) !== null) {
        const mermaidCode = match[1];
        const originalBlock = match[0];

        // Create image directory structure
        const fileBaseName = path.basename(file, '.md');
        const imageDir = path.join(workDir, 'image', fileBaseName);
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        const timestamp = Date.now();
        const mmdFileName = path.join(imageDir, `mermaid_${timestamp}_${counter}.mmd`);
        const pngFileName = path.join(imageDir, `mermaid_${timestamp}_${counter}.png`);
        const relativePngPath = `image/${fileBaseName}/mermaid_${timestamp}_${counter}.png`;

        fs.writeFileSync(mmdFileName, mermaidCode);

        try {
            console.log(`Generating image for ${file} - Diagram ${counter}...`);
            // Use npx to run mmdc. -i input -o output
            // Added --puppeteerConfigFile to potentially skip sandbox if needed, but let's try default first.
            // On some systems --no-sandbox is required for puppeteer.
            execSync(`npm exec --yes --package=@mermaid-js/mermaid-cli -- mmdc -i "${mmdFileName}" -o "${pngFileName}" -b transparent`, { stdio: 'inherit', cwd: workDir });

            // Check if png exists
            if (fs.existsSync(pngFileName)) {
                replacements.push({
                    original: originalBlock,
                    replacement: `![流程图](${relativePngPath})`
                });
                // Cleanup mmd file
                fs.unlinkSync(mmdFileName);
            } else {
                console.error(`Failed to generate PNG for ${mmdFileName}`);
            }
        } catch (error) {
            console.error(`Error processing diagram ${counter} in ${file}:`, error.message);
        }
        counter++;
    }

    // Apply replacements
    if (replacements.length > 0) {
        replacements.forEach(rep => {
            content = content.replace(rep.original, rep.replacement);
        });
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file} with ${replacements.length} diagrams.`);
    } else {
        console.log(`No diagrams updated for ${file}.`);
    }
});
