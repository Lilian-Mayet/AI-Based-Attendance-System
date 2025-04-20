// src/components/Footer.tsx
import React from 'react';
import Image from 'next/image';

interface FooterProps {}

const Footer: React.FC<FooterProps> = () => {
  const companyName = 'EduTrack AI';
  const tagline = '- Automated Attendance and Security System';
  const description = 'Providing cutting-edge AI solutions for efficient attendance management and enhanced security.';
  const myName = 'Mayet Lilian';
  const colleagueName = 'Godet Remi';
  const phoneNumber = '+91 9035107836';
  const email = 'mayetlilian@gmail.com';
  const logoSrc = '/images/logo.png';

  return (
    <footer
      style={{
        backgroundColor: 'black',
        color: 'white',
        padding: '1.5rem', // Slightly reduced overall padding
        textAlign: 'left', // Align text to the left within its container
        position: 'fixed',
        bottom: 0,
        width: '100%',
        fontSize: '0.9rem',
        lineHeight: '1.6',
        display: 'flex', // Use flexbox for the main layout
        alignItems: 'center', // Vertically align items in the center
      }}
    >
      {/* Logo Section (takes approximately 20% width) */}
      <div style={{ flex: '0 0 20%', marginRight: '1.5rem' }}>
        {logoSrc && (
          <Image src={logoSrc} alt="EduTrack AI Logo" width={100} height={40} style={{ objectFit: 'contain' }} />
        )}
      </div>

      {/* Text Content Section (takes the remaining space) */}
      <div style={{ flex: '1' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{companyName}</h3>
        <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.5rem' }}>
          {tagline} <br /> {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
          <p>Developed by: {myName} & {colleagueName}</p>
          <div>
            <p>Contact: <a href={`tel:${phoneNumber}`} style={{ color: 'white', textDecoration: 'none' }}>{phoneNumber}</a></p>
            <p><a href={`mailto:${email}`} style={{ color: 'white', textDecoration: 'none' }}>{email}</a></p>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;