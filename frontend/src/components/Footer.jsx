// frontend/src/components/Footer.jsx
import { Shield, Heart, HelpCircle, FileText, GitBranch, Building2, ClipboardCheck } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          {/* Copyright */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-500">
              © {currentYear} HICMS. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a 
              href="#" 
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Privacy Policy
            </a>
            <a 
              href="#" 
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </a>
            <a 
              href="#" 
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Help
            </a>
          </div>

          {/* Version */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Version 2.0.0</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-green-500" />
              <span>Hospital Inspection &</span>
              <ClipboardCheck className="w-3 h-3 text-green-500" />
              <span>Compliance Monitoring System</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}