import Tesseract from 'tesseract.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function pdfToImages(pdfPath: string, outputDir: string): Promise<string[]> {
    const pdfName = path.basename(pdfPath, '.pdf');
    const outputPattern = path.join(outputDir, `${pdfName}-%d.png`);

    const command = `pdftoppm "${pdfPath}" "${outputPattern}" -png`;

    try {
        await execPromise(command);
    } catch (error) {
        throw new Error(`Failed to convert PDF to images: ${error}`);
    }

    const imageFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.png'));
    return imageFiles.map(file => path.join(outputDir, file));
}

// Function to perform OCR using Tesseract.js
async function performOCR(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(
            imagePath,
            'eng', 
            {
            }
        ).then(({ data: { text } }) => resolve(text))
            .catch(reject);
    });
}

export default async function parsePdf(pdfPath: string, outputDir: string): Promise<string> {
    try {
        const imagePaths = await pdfToImages(pdfPath, outputDir);

        let extractedText = '';

        const ocrPromises = imagePaths.map((imagePath) => {
            return performOCR(imagePath).then((pageText) => {
                extractedText += pageText + '\n';
            });
        });

        await Promise.all(ocrPromises);

        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        imagePaths.forEach(imagePath => {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });

        return extractedText;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }
}
