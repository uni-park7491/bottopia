"""Build locally, or sign/notarize with explicitly configured credentials. Never publishes."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run(args, check=True, cwd=ROOT)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--submit', action='store_true')
    args = parser.parse_args()
    identity = os.environ.get('BOTTOPIA_DEVELOPER_ID', '')
    profile = os.environ.get('BOTTOPIA_NOTARY_PROFILE', '')
    if args.submit:
        identities = subprocess.check_output(['security','find-identity','-v','-p','codesigning'], text=True)
        if not identity.startswith('Developer ID Application:') or identity not in identities:
            parser.error('A valid BOTTOPIA_DEVELOPER_ID Application signing identity is required; no submission performed.')
        if not profile:
            parser.error('BOTTOPIA_NOTARY_PROFILE must name an existing notarytool Keychain profile.')
    run('node','scripts/package-tts-connector.mjs','--qwen-source')
    parent = ROOT / 'artifacts/macos'
    parent.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix='build-', dir=parent))
    app = output / 'BOTTOPIA Connector.app'
    contents = app / 'Contents'
    binary = contents / 'MacOS/BottopiaConnector'
    binary.parent.mkdir(parents=True)
    resources = contents / 'Resources/connector'
    resources.mkdir(parents=True)
    with zipfile.ZipFile(ROOT / 'public/downloads/bottopia-qwen-source.zip') as archive:
        for item in archive.infolist():
            relative = Path(item.filename).relative_to('bottopia-qwen-source')
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError('Unsafe archive path')
            destination = resources / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(item))
    info = dict(CFBundleIdentifier='studio.bottopia.connector', CFBundleName='BOTTOPIA Connector',
                CFBundleExecutable='BottopiaConnector', CFBundlePackageType='APPL',
                CFBundleShortVersionString='0.1.0', CFBundleVersion='1', LSMinimumSystemVersion='13.0',
                NSHighResolutionCapable=True)
    (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
    run('xcrun','swiftc','-swift-version','5','-target','arm64-apple-macos13.0',
        str(ROOT/'desktop/macos/Launcher.swift'),'-o',str(binary),'-framework','AppKit')
    # Ad-hoc is for local build verification only and does NOT satisfy Gatekeeper.
    signing = ['codesign','--force','--options','runtime','--sign', identity if args.submit else '-']
    if args.submit: signing += ['--timestamp']
    run(*signing,str(app))
    run('codesign','--verify','--strict','--verbose=2',str(app))
    report = {'app':str(app),'architecture':'arm64','developerIdSigned':args.submit,'notarized':False,'published':False}
    if args.submit:
        payload = output/'submission.zip'
        run('ditto','-c','-k','--keepParent',str(app),str(payload))
        result = subprocess.check_output(['xcrun','notarytool','submit',str(payload),'--keychain-profile',profile,'--wait','--output-format','json'],text=True)
        status = json.loads(result)
        (output/'notary-result.json').write_text(json.dumps(status,indent=2))
        if status.get('status') != 'Accepted':
            raise RuntimeError('Apple did not accept this submission. See notary-result.json; do not publish.')
        run('xcrun','stapler','staple',str(app))
        run('xcrun','stapler','validate',str(app))
        run('spctl','--assess','--type','execute','--verbose=4',str(app))
        report['notarized'] = True
        run('ditto','-c','-k','--keepParent',str(app),str(output/'bottopia-macos-notarized.zip'))
    (output/'build-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__ == '__main__': main()
