
export default function footer() {
    return (
        <div className="w-full bg-black text-gray-300 px-8 py-12">
            <div className="grid grid-cols-4 gap-8">
                <div>
                    <h3 className="text-white font-semibold mb-3">GlobeTrek</h3>
                    <p className="text-sm text-gray-400">Explore the world with AI-powered travel insights and interactive globe visualization.</p>
                </div>
                <div>
                    <h3 className="text-white font-semibold mb-3">Quick Links</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white">Home</a></li>
                        <li><a href="#" className="hover:text-white">About Us</a></li>
                        <li><a href="#" className="hover:text-white">Features</a></li>
                        <li><a href="#" className="hover:text-white">Contact</a></li>
                    </ul>
                </div>

                {/* Legal */}
                <div>
                    <h3 className="text-white font-semibold mb-3">Legal</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                        <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
                        <li><a href="#" className="hover:text-white">Disclaimer</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-white font-semibold mb-3">Connect</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white">Twitter</a></li>
                        <li><a href="#" className="hover:text-white">LinkedIn</a></li>
                        <li><a href="#" className="hover:text-white">GitHub</a></li>
                        <li className="text-gray-400">support@globetrek.com</li>
                    </ul>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-gray-700 mt-6 pt-4 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} GlobeTrek. All rights reserved.
            </div>
        </div>
    );
}