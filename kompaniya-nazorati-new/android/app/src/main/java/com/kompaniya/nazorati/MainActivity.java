package com.kompaniya.nazorati;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		if (getBridge() != null && getBridge().getWebView() != null) {
			getBridge().getWebView().setBackgroundColor(Color.rgb(245, 246, 241));
			getBridge().getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
			getBridge().getWebView().setLayerType(View.LAYER_TYPE_SOFTWARE, null);
		}
	}
}
