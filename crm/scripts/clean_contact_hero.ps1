$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public class ImageCleaner {
    public static void CleanContactHero(string srcPath, string destPath) {
        byte[] fileBytes = File.ReadAllBytes(srcPath);
        using (MemoryStream ms = new MemoryStream(fileBytes))
        using (Bitmap bmp = new Bitmap(ms)) {
            int w = bmp.Width;
            int h = bmp.Height;

            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;

                // 1. HARDHAT (Left): Seamlessly patch hardhat curve with neighboring hardhat white texture
                int hx = (int)(w * 0.165);
                int hy = (int)(h * 0.33);
                int hw = (int)(w * 0.07);
                int hh = (int)(h * 0.07);

                // Sample clean hardhat white color from above text
                Color hardhatWhite = bmp.GetPixel((int)(w * 0.18), (int)(h * 0.28));
                using (SolidBrush brush = new SolidBrush(hardhatWhite)) {
                    g.FillEllipse(brush, hx - 4, hy - 4, hw + 8, hh + 8);
                }

                // 2. TABLET HEADER BAR (Top of Tablet screen): Sample header dark slate color #1b2838
                int tx = (int)(w * 0.495);
                int ty = (int)(h * 0.245);
                int tw = (int)(w * 0.20);
                int th = (int)(h * 0.030);

                Color headerColor = bmp.GetPixel((int)(w * 0.65), (int)(h * 0.26));
                using (SolidBrush brush = new SolidBrush(headerColor)) {
                    g.FillRectangle(brush, tx, ty, tw, th);
                }

                // 3. TABLET FOOTER (Bottom Right of Tablet screen): Sample white screen background
                int fx = (int)(w * 0.74);
                int fy = (int)(h * 0.63);
                int fw = (int)(w * 0.08);
                int fh = (int)(h * 0.035);

                Color screenWhite = bmp.GetPixel((int)(w * 0.72), (int)(h * 0.63));
                using (SolidBrush brush = new SolidBrush(screenWhite)) {
                    g.FillRectangle(brush, fx - 2, fy - 2, fw + 4, fh + 4);
                }

                // 4. BLUEPRINT TITLE BLOCK (Bottom Left on paper): Sample paper white background
                int bx = (int)(w * 0.21);
                int by = (int)(h * 0.72);
                int bw = (int)(w * 0.08);
                int bh = (int)(h * 0.045);

                Color paperWhite = bmp.GetPixel((int)(w * 0.19), (int)(h * 0.72));
                using (SolidBrush brush = new SolidBrush(paperWhite)) {
                    g.FillRectangle(brush, bx - 2, by - 2, bw + 4, bh + 4);
                }
            }

            bmp.Save(destPath, ImageFormat.Jpeg);
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$srcPath = "C:\Users\Isaiah Mpofu\.gemini\antigravity\brain\c73f188e-735d-4055-8edb-d7cac42334ca\contact_hero_1788784954983.jpg"
$destPath = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\assets\images\contact_hero.jpg"

Write-Host "Cleaning contact hero image to 100% pristine unbranded standard..."
[ImageCleaner]::CleanContactHero($srcPath, $destPath)
Write-Host "Contact hero image cleaned successfully!"
