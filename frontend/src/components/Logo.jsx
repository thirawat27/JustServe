import icon from '../assets/images/icon.png';

const Logo = ({ className = "" }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img
                src={icon}
                alt="JustServe Logo"
                className="w-12 h-12 object-contain drop-shadow-lg"
            />
            <span className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500">
                JustServe
            </span>
        </div>
    );
};

export default Logo;
