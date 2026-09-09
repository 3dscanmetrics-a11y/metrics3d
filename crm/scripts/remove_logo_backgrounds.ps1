$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class ImageProcessor {
    public static void ProcessImage(string srcPath, string destPath) {
        byte[] fileBytes = File.ReadAllBytes(srcPath);
        using (MemoryStream ms = new MemoryStream(fileBytes))
        using (Bitmap origBmp = new Bitmap(ms)) {
            int w = origBmp.Width;
            int h = origBmp.Height;
            using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.DrawImage(origBmp, 0, 0, w, h);
                }

                BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(data.Stride) * h;
                byte[] rgbValues = new byte[bytes];
                Marshal.Copy(data.Scan0, rgbValues, 0, bytes);

                // Global near-white threshold check: B, G, R >= 215 -> Alpha = 0
                for (int i = 0; i < bytes; i += 4) {
                    byte b = rgbValues[i];
                    byte g = rgbValues[i + 1];
                    byte r = rgbValues[i + 2];

                    if (r >= 215 && g >= 215 && b >= 215) {
                        rgbValues[i + 3] = 0; // Alpha = 0 (Transparent)
                    }
                }

                Marshal.Copy(rgbValues, 0, data.Scan0, bytes);
                bmp.UnlockBits(data);

                bmp.Save(destPath, ImageFormat.Png);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$srcDir = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\assets\clients"

$files = Get-ChildItem $srcDir

foreach ($file in $files) {
    if ($file.Extension -notmatch "\.(jpg|jpeg|png)$") { continue }
    
    $imgPath = $file.FullName
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name).ToLower()
    $outPath = Join-Path $srcDir "$baseName.png"
    
    Write-Host "Processing: $($file.Name) -> $baseName.png..."
    [ImageProcessor]::ProcessImage($imgPath, $outPath)
}

Write-Host "All logo backgrounds processed cleanly!"
