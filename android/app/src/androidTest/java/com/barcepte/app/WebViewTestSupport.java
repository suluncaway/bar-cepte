package com.barcepte.app;

import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

public class WebViewTestSupport {
    protected WebView findWebView(View view) {
        if (view instanceof WebView) return (WebView)view;
        if (view instanceof ViewGroup) {
            ViewGroup group=(ViewGroup)view;
            for(int i=0;i<group.getChildCount();i++) {WebView found=findWebView(group.getChildAt(i));if(found!=null)return found;}
        }
        return null;
    }
    protected String evaluate(ActivityScenario<MainActivity> scenario,String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);
        AtomicReference<String> value=new AtomicReference<>();
        scenario.onActivity(activity->{
            WebView web=findWebView(activity.getWindow().getDecorView());
            assertNotNull("WebView must exist",web);
            web.evaluateJavascript(expression,result->{value.set(result);latch.countDown();});
        });
        assertTrue("JavaScript callback timed out",latch.await(10,TimeUnit.SECONDS));
        return value.get();
    }
    protected void await(ActivityScenario<MainActivity> scenario,String condition) throws Exception {
        long until=SystemClock.elapsedRealtime()+30000;
        while(SystemClock.elapsedRealtime()<until) {
            if("true".equals(evaluate(scenario,condition)))return;
            SystemClock.sleep(150);
        }
        fail("WebView condition timed out: "+condition);
    }
}
