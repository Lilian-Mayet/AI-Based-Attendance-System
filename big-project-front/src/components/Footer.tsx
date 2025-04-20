// src/components/Footer.tsx
import React from 'react';
import Image from 'next/image'; // Import Next.js Image component for optimized images

interface FooterProps {}

const Footer: React.FC<FooterProps> = () => {
  const companyName = 'EduTrack AI';
  const tagline = '- Automated Attendance and Security System';
  const description = 'Providing cutting-edge AI solutions for efficient attendance management and enhanced security.';
  const myName = 'Your Name';
  const colleagueName = 'Colleague\'s Name';
  const phoneNumber = '+91 XXXXXXXXXX';
  const email = 'contact@edutrackai.com';
  const logoSrc = '/images/edutrack-ai-logo.png'; // Path to your logo (place it in the public/images folder)

  return (
    <footer
      style={{
        backgroundColor: 'black',
        color: 'white',
        padding: '2rem',
        textAlign: 'center',
        position: 'fixed',
        bottom: 0,
        width: '100%',
        fontSize: '0.9rem',
        lineHeight: '1.6',
        display: 'flex',
        flexDirection: 'column', // Arrange items vertically
        alignItems: 'center', // Center items horizontally
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        {logoSrc && (
          <div style={{ marginBottom: '0.5rem' }}>
            <Image src={logoSrc} alt="EduTrack AI Logo" width={100} height={40} /> {/* Adjust width and height */}
          </div>
        )}
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{companyName}</h3>
        <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.5rem' }}>
          {tagline}
          <br />
          {description}
        </p>
      </div>
      <hr style={{ borderTop: '1px solid #555', margin: '1rem 0', width: '80%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-around', width: '80%', marginBottom: '0.5rem' }}>
        <p>Developed by: {myName} & {colleagueName}</p>
        <div>
          <p>
            Contact: <a href={`tel:${phoneNumber}`} style={{ color: 'white', textDecoration: 'none' }}>{phoneNumber}</a>
          </p>
          <p>
            <a href={`mailto:${email}`} style={{ color: 'white', textDecoration: 'none' }}>{email}</a>
          </p>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem' }}>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
    </footer>
  );
};

export default Footer;