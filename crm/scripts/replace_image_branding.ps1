$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;

public class ImageRetoucher {
    public static void RetouchContactHero(string srcPath, string destPath, string logoPath) {
        byte[] fileBytes = File.ReadAllBytes(srcPath);
        using (MemoryStream ms = new MemoryStream(fileBytes))
        using (Bitmap bmp = new Bitmap(ms)) {
            int w = bmp.Width;
            int h = bmp.Height;

            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

                // 1. HARDHAT (Left): Cover old Aether text with clean hardhat white background and add 3D Scan Metrics brand text
                int hardhatX = (int)(w * 0.16);
                int hardhatY = (int)(h * 0.32);
                int hardhatW = (int)(w * 0.08);
                int hardhatH = (int)(h * 0.08);

                // Sample hardhat white color
                Color whiteBg = bmp.GetPixel(hardhatX - 10, hardhatY - 10);
                using (SolidBrush brush = new SolidBrush(whiteBg)) {
                    g.FillEllipse(brush, hardhatX - 5, hardhatY - 5, hardhatW + 10, hardhatH + 10);
                }

                // Draw official emblem if available or crisp brand text
                if (File.Exists(logoPath)) {
                    using (Image logo = Image.FromFile(logoPath)) {
                        g.DrawImage(logo, hardhatX, hardhatY, hardhatW, (int)(hardhatW * (float)logo.Height / logo.Width));
                    }
                } else {
                    using (Font font = new Font("Arial", 14, FontStyle.Bold))
                    using (SolidBrush redBrush = new SolidBrush(Color.FromArgb(255, 59, 48))) {
                        g.DrawString("3D SCAN", font, redBrush, hardhatX, hardhatY);
                        using (SolidBrush darkBrush = new SolidBrush(Color.FromArgb(15, 23, 42))) {
                            g.DrawString("METRICS", font, darkBrush, hardhatX, hardhatY + 16);
                        }
                    }
                }

                // 2. TABLET HEADER BAR (Top of Tablet screen): Cover old Aether header bar with clean dark slate bar
                int headerX = (int)(w * 0.50);
                int headerY = (int)(h * 0.25);
                int headerW = (int)(w * 0.18);
                int headerH = (int)(h * 0.025);

                Color darkBarColor = Color.FromArgb(22, 33, 48);
                using (SolidBrush darkBrush = new SolidBrush(darkBarColor)) {
                    g.FillRectangle(darkBrush, headerX, headerY, headerW, headerH);
                }

                using (Font font = new Font("Segoe UI", 9, FontStyle.Bold))
                using (SolidBrush whiteBrush = new SolidBrush(Color.FromArgb(230, 240, 255))) {
                    g.DrawString("3D SCAN METRICS | CONSULTATION PORTAL", font, whiteBrush, headerX + 2, headerY + 2);
                }

                // 3. TABLET FOOTER (Bottom Right of Tablet screen): Cover old AETHER footer
                int tabFooterX = (int)(w * 0.74);
                int tabFooterY = (int)(h * 0.63);
                int tabFooterW = (int)(w * 0.07);
                int tabFooterH = (int)(h * 0.03);

                Color tabFooterBg = Color.FromArgb(248, 250, 252);
                using (SolidBrush brush = new SolidBrush(tabFooterBg)) {
                    g.FillRectangle(brush, tabFooterX, tabFooterY, tabFooterW, tabFooterH);
                }
                using (Font font = new Font("Segoe UI", 8, FontStyle.Bold))
                using (SolidBrush brandBrush = new SolidBrush(Color.FromArgb(255, 59, 48))) {
                    g.DrawString("3D SCAN METRICS", font, brandBrush, tabFooterX, tabFooterY + 2);
                }

                // 4. BLUEPRINT TITLE BLOCK (Bottom Left on paper): Cover old AETHER CONSULTANTS
                int bpX = (int)(w * 0.21);
                int bpY = (int)(h * 0.72);
                int bpW = (int)(w * 0.08);
                int bpH = (int)(h * 0.04);

                Color paperBg = bmp.GetPixel(bpX - 10, bpY);
                using (SolidBrush brush = new SolidBrush(paperBg)) {
                    g.FillRectangle(brush, bpX, bpY, bpW, bpH);
                }
                using (Font font = new Font("Arial", 8, FontStyle.Bold))
                using (SolidBrush darkBrush = new SolidBrush(Color.FromArgb(30, 41, 59))) {
                    g.DrawString("3D SCAN METRICS", font, darkBrush, bpX, bpY + 2);
                    using (Font subFont = new Font("Arial", 6, FontStyle.Regular)) {
                        g.DrawString("CONSULTANTS ZA", subFont, darkBrush, bpX, bpY + 14);
                    }
                }
            }

            bmp.Save(destPath, ImageFormat.Jpeg);
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$srcPath = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\assets\images\contact_hero.jpg"
$destPath = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\assets\images\contact_hero.jpg"
$logoPath = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\logo.png"

Write-Host "Retouching contact hero image with 3D Scan Metrics branding..."
[ImageRetoucher]::RetouchContactHero($srcPath, $destPath, $logoPath)
Write-Host "Contact hero image retouched successfully!"
