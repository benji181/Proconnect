import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { supabase } from '../supabaseClient';  // Supabase client initialization

const sections = [
  'Basic Info',
  'Professional Summary',
  'Work Experience',
  'Education',
  'Skills',
  'Certifications',
  'Resume',
  'Application Tracker',
];

const ProfilePage = () => {
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 
   const [user, setUser] = useState(null);


  const [profileData, setProfileData] = useState({
    fullName: '',
    photoURL: '',
    email: user?.email || '',
    professionalSummary: '',
    workExperience: '',
    education: '',
    skills: '',
    certifications: '',
    resumeUrl: '',
    applicationTracker: [],
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);
  
  // Load profile data on mount and when user changes
  useEffect(() => {
    const loadUserImage = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_images')
          .select('image_url')
          .eq('user_email', user.email)
          .order('uploaded_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data?.length > 0) {
          setProfileData(prev => ({ ...prev, photoURL: data[0].image_url }));
        }
      } catch (err) {
        console.error('Failed to load user image:', err.message);
      }
    };
  
    loadUserImage();
  }, [user]);
  

  // Handle photo upload to Supabase and update metadata and Firestore
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');
    setSuccessMsg('');
    try {
      const filePath = `${user.uid}/${file.name}`;

      // Upload image to Supabase Storage "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL for uploaded image
      const { data, error: urlError } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      if (urlError) throw urlError;
      if (!data?.publicUrl) throw new Error('No public URL returned');
      const publicURL = data.publicUrl;

      // Insert metadata record in Supabase table "user_images"
      const { error: insertError } = await supabase
        .from('user_images')
        .insert([{ user_email: user.email, image_url: publicURL }]);
      if (insertError) throw insertError;

      // Update Firestore profile document's photoURL field
      await setDoc(
        doc(db, 'userProfiles', user.uid),
        { photoURL: publicURL },
        { merge: true }
      );

      // Update local component state to show uploaded photo immediately
      setProfileData((prev) => ({ ...prev, photoURL: publicURL }));
      setSuccessMsg('Image uploaded successfully!');
    } catch (err) {
      setError('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  // Handle input changes for text fields
  const handleInputChange = (field) => (e) => {
    setProfileData({ ...profileData, [field]: e.target.value });
  };

  // Save all profile data back to Firestore
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await setDoc(doc(db, 'userProfiles', user.uid), profileData, { merge: true });
      setSuccessMsg('Profile saved successfully');
    } catch (err) {
      setError('Failed to save profile');
    }
    setSaving(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 250,
          bgcolor: 'background.paper',
          borderRight: '1px solid #ddd',
          height: '100vh',
          position: 'sticky',
          top: 0,
          p: 2,
        }}
      >
        <Typography variant="h6" mb={2}>
          Profile Sections
        </Typography>
        <List>
          {sections.map((section) => (
            <ListItem key={section} disablePadding>
              <ListItemButton
                selected={activeSection === section}
                onClick={() => setActiveSection(section)}
              >
                <ListItemText primary={section} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ p: 4, flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>{activeSection}</Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            {successMsg && <Alert severity="success">{successMsg}</Alert>}

            {activeSection === 'Basic Info' && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar src={profileData.photoURL} alt={profileData.fullName} sx={{ width: 180, height: 180 }} />
                  <Button variant="outlined" component="label" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                    <input hidden accept="image/*" type="file" onChange={handlePhotoChange} />
                  </Button>
                </Box>
                <TextField
                  label="Full Name" value={profileData.fullName} onChange={handleInputChange('fullName')}
                  fullWidth margin="normal"
                />
                <TextField label="Email" value={profileData.email} fullWidth margin="normal" disabled />
              </>
            )}

            {activeSection === 'Professional Summary' && (
              <TextField
                label="Professional Summary" value={profileData.professionalSummary} onChange={handleInputChange('professionalSummary')}
                multiline rows={6} fullWidth margin="normal"
              />
            )}

            {activeSection === 'Work Experience' && (
              <TextField
                label="Work Experience" value={profileData.workExperience} onChange={handleInputChange('workExperience')}
                multiline rows={8} fullWidth margin="normal" placeholder="List your past roles, companies, dates, and responsibilities"
              />
            )}

            {activeSection === 'Education' && (
              <TextField
                label="Education" value={profileData.education} onChange={handleInputChange('education')}
                multiline rows={6} fullWidth margin="normal" placeholder="List your academic background"
              />
            )}

            {activeSection === 'Skills' && (
              <TextField
                label="Skills" value={profileData.skills} onChange={handleInputChange('skills')}
                multiline rows={4} fullWidth margin="normal" placeholder="List your relevant skills"
              />
            )}

            {activeSection === 'Certifications' && (
              <TextField
                label="Certifications & Achievements" value={profileData.certifications} onChange={handleInputChange('certifications')}
                multiline rows={4} fullWidth margin="normal"
              />
            )}

            {activeSection === 'Resume' && (
              <>
                <Typography>
                  Current Resume URL:{' '}
                  {profileData.resumeUrl ? (
                    <a href={profileData.resumeUrl} target="_blank" rel="noopener noreferrer">View Resume</a>
                  ) : 'No resume uploaded'}
                </Typography>
              </>
            )}

            {activeSection === 'Application Tracker' && (
              <>
                {profileData.applicationTracker.length === 0 ? (
                  <Typography>You have no job applications yet.</Typography>
                ) : (
                  profileData.applicationTracker.map((app, index) => (
                    <Box key={index} mb={2}>
                      <Typography><b>{app.jobTitle}</b> at <i>{app.company}</i> - Status: {app.status}</Typography>
                      <Typography variant="caption">Applied on: {app.applicationDate}</Typography>
                      <Divider sx={{ my: 1 }} />
                    </Box>
                  ))
                )}
              </>
            )}

            <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ProfilePage;
