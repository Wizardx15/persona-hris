import { Resend } from 'resend';

const resend = new Resend('re_yCKaxeMm_7yPr9gD35msLd4VRbJteJMBe');

async function testEmail() {
  try {
    console.log('📧 Mencoba mengirim email...');
    
    const data = await resend.emails.send({
      from: 'Persona HRIS <onboarding@resend.dev>',
      to: ['danawahyu04@gmail.com'],
      subject: 'Test Email dari Persona HRIS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            h1 { margin: 0; }
            .success { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Persona HRIS</h1>
            </div>
            <div class="content">
              <h2>Halo! 👋</h2>
              <p>Ini adalah <strong>test email</strong> dari Persona HRIS.</p>
              <p class="success">✅ Notifikasi email berhasil di setup!</p>
              <p>Sekarang setiap kali admin approve/reject cuti, karyawan akan mendapat email notifikasi.</p>
              <hr>
              <p><small>Email ini dikirim untuk testing pada: ${new Date().toLocaleString('id-ID')}</small></p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Email berhasil dikirim!');
    console.log('📬 Detail:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Jalankan fungsi
testEmail();