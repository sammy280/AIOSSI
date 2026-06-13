import { Link } from 'react-router-dom';
import { ChefHat, MapPin, Phone, Mail, Facebook, Instagram, Twitter, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Sammy's</p>
                <p className="text-xs text-brand">Restaurant & Bar</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Experience the finest dining in Kigali. Fresh ingredients, passionate chefs, and an unforgettable atmosphere.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-brand transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {[['Home', '/'], ['Menu', '/menu'], ['My Orders', '/orders'], ['My Profile', '/profile']].map(([l, h]) => (
                <li key={l}><Link to={h} className="hover:text-brand transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Opening Hours</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-brand" /><span>Mon – Fri: 7:00 AM – 11:00 PM</span></div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-brand" /><span>Sat – Sun: 8:00 AM – 12:00 AM</span></div>
              <div className="mt-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-xs font-semibold">🟢 We're Open Now</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" /><span>KG 123 Street, Kigali, Rwanda</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /><a href="tel:+250788000000" className="hover:text-brand">+250 788 000 000</a></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /><a href="mailto:info@sammy.rw" className="hover:text-brand">info@sammy.rw</a></div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Sammy's Restaurant & Bar. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-brand transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
