import type { Metadata } from "next";
import Script from "next/script";
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Scheduler Platform",
  description: "SaaS Scheduling Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script id="whop-pixel" strategy="beforeInteractive">{`!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");whop.setScope("biz_MLK9EZ6ezy78WA");whop.track("page");`}</Script>
      </head>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
