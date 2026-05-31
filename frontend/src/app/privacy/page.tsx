import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

            <div className="space-y-6 text-slate-300">
                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">1. Introduction</h2>
                    <p>
                        Welcome to IOCenrich. We respect your privacy and are committed to protecting your personal data.
                        This resulting policy will inform you as to how we look after your personal data when you visit our
                        website and tell you about your privacy rights.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">2. Data We Collect</h2>
                    <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                        <li><strong>Contact Data:</strong> includes email address.</li>
                        <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                        <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">3. How We Use Your Data</h2>
                    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                        <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                        <li>Where we need to comply with a legal obligation.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">4. Third-Party Advertising and Cookies</h2>
                    <p>
                        We use third-party advertising companies, such as Google AdSense, to serve ads when you visit our website.
                        These companies may use information (not including your name, address, email address, or telephone number)
                        about your visits to this and other websites in order to provide advertisements about goods and services of
                        interest to you.
                    </p>
                    <p className="mt-2">
                        Google, as a third-party vendor, uses cookies to serve ads on our site. Google's use of the DART cookie
                        enables it to serve ads to our users based on previous visits to our site and other sites on the Internet.
                        Users may opt-out of the use of the DART cookie by visiting the Google Ad and Content Network privacy policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">5. Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost,
                        used or accessed in an unauthorised way, altered or disclosed. Find out more by contacting us.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">6. Your Legal Rights</h2>
                    <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Request access to your personal data.</li>
                        <li>Request correction of your personal data.</li>
                        <li>Request erasure of your personal data.</li>
                        <li>Object to processing of your personal data.</li>
                        <li>Request restriction of processing your personal data.</li>
                        <li>Request transfer of your personal data.</li>
                        <li>Right to withdraw consent.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-3 text-slate-100">7. Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at our provided support email.
                    </p>
                </section>

                <p className="mt-8 text-sm text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
