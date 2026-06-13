import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { NeuralNetworkBackground } from '@/components/NeuralNetworkBackground';

function PasswordStrengthMeter({ password }: { password: string }) {
  // Lightweight heuristic — actual policy enforcement is on the backend.
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const label =
    score === 0 ? '' :
    score === 1 ? 'Débil' :
    score === 2 ? 'Aceptable' :
    score === 3 ? 'Fuerte' : 'Muy fuerte';

  const color =
    score <= 1 ? 'bg-red-500' :
    score === 2 ? 'bg-amber-500' :
    score === 3 ? 'bg-blue-500' : 'bg-green-500';

  if (!password) return null;
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i < score ? color : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('El username debe tener al menos 3 caracteres.');
      return;
    }
    if (!email.includes('@')) {
      setError('Email inválido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await signup({
        username,
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      // signup landed an authenticated session — go to the home page.
      navigate('/', { replace: true });
    } catch {
      // Toast already shown by AuthContext.
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden py-8 px-4">
      <NeuralNetworkBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
          <p className="text-gray-400 mt-2 text-sm">
            10 búsquedas gratis al día. Sin tarjeta requerida.
          </p>
        </div>

        <Card className="bg-[#141414] border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Regístrate</CardTitle>
            <CardDescription className="text-gray-400">
              Empieza a buscar en segundos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-gray-300 text-xs">
                    Nombre
                  </Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-gray-300 text-xs">
                    Apellido
                  </Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-gray-300 text-xs">
                  Username *
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="ej. juan_perez"
                  className="bg-white/5 border-white/10 text-white"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300 text-xs">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="bg-white/5 border-white/10 text-white"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-300 text-xs">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="bg-white/5 border-white/10 text-white pr-10"
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              <Button
                type="submit"
                className="w-full btn-primary mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta gratis'
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
              <div className="text-xs text-gray-400 space-y-1.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>10 búsquedas diarias gratis</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>Acceso a OFAC, EU, UN, INTERPOL y más</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>Sin tarjeta de crédito</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2 border-t border-white/5">
                ¿Ya tienes cuenta?{' '}
                <Link
                  to="/login"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default SignUpPage;
