import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Alert } from '../../../components';
import { APP_NAME } from '../../../constants';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationResult({
          success: false,
          message: 'Invalid verification link. No token provided.'
        });
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationResult({
            success: true,
            message: data.message || 'Email verified successfully! You can now log in.'
          });
        } else {
          setVerificationResult({
            success: false,
            message: data.error?.message || 'Verification failed. The link may be invalid or expired.'
          });
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationResult({
          success: false,
          message: 'Failed to verify email. Please try again later.'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    // TODO: Implement resend verification functionality
    console.log('Resend verification not implemented yet');
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Email Verification
          </h2>

          {isVerifying ? (
            <div className="py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email address...</p>
            </div>
          ) : verificationResult ? (
            <div className="space-y-4">
              <Alert
                type={verificationResult.success ? 'success' : 'error'}
                message={verificationResult.message}
              />

              {verificationResult.success ? (
                <div className="space-y-4 pt-4">
                  <div className="text-green-600 text-lg">
                    ✅ Verification Complete!
                  </div>
                  <p className="text-gray-600 text-sm">
                    Your email has been successfully verified. You can now access all features of {APP_NAME}.
                  </p>
                  <Button 
                    onClick={() => navigate('/login')} 
                    variant="primary" 
                    className="w-full"
                    size="lg"
                  >
                    Continue to Login
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="text-red-600 text-lg">
                    ❌ Verification Failed
                  </div>
                  <p className="text-gray-600 text-sm">
                    The verification link may be invalid, expired, or already used.
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => navigate('/login')} 
                      variant="primary" 
                      className="w-full"
                      size="lg"
                    >
                      Go to Login
                    </Button>
                    <p className="text-sm text-gray-500">
                      Need a new verification email?{' '}
                      <Link to="/signup" className="font-medium text-blue-600 hover:underline">
                        Sign up again
                      </Link> or contact support.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

export default EmailVerificationPage; 